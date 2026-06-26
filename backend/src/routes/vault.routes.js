const express = require("express");
const { body, validationResult } = require("express-validator");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { generateSalt, deriveKey, encrypt, decrypt, buildCheckValue, verifyCheckValue } = require("../utils/vaultCrypto");

const router = express.Router();
router.use(requireAuth);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

// GET /api/vault/status - does this user have a vault set up yet?
router.get("/status", async (req, res, next) => {
  try {
    const meta = await prisma.vaultMeta.findUnique({ where: { userId: req.user.id } });
    res.json({ initialized: !!meta });
  } catch (err) {
    next(err);
  }
});

// POST /api/vault/setup - first-time master password creation
router.post(
  "/setup",
  [body("masterPassword").isLength({ min: 8 }).withMessage("Master password must be at least 8 characters.")],
  handleValidation,
  async (req, res, next) => {
    try {
      const existing = await prisma.vaultMeta.findUnique({ where: { userId: req.user.id } });
      if (existing) return res.status(409).json({ error: "Vault is already set up. Use unlock instead." });

      const { masterPassword } = req.body;
      const salt = generateSalt();
      const key = deriveKey(masterPassword, salt);
      const check = buildCheckValue(key);

      await prisma.vaultMeta.create({
        data: {
          userId: req.user.id,
          salt,
          checkCiphertext: check.ciphertext,
          checkIv: check.iv,
          checkAuthTag: check.authTag,
        },
      });

      res.status(201).json({ message: "Vault created." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/vault/unlock - verify a master password attempt (does not persist anything server-side)
router.post(
  "/unlock",
  [body("masterPassword").notEmpty().withMessage("Master password is required.")],
  handleValidation,
  async (req, res, next) => {
    try {
      const meta = await prisma.vaultMeta.findUnique({ where: { userId: req.user.id } });
      if (!meta) return res.status(404).json({ error: "Vault has not been set up yet." });

      const key = deriveKey(req.body.masterPassword, meta.salt);
      const valid = verifyCheckValue(meta.checkCiphertext, meta.checkIv, meta.checkAuthTag, key);

      if (!valid) return res.status(401).json({ error: "Incorrect master password." });
      res.json({ unlocked: true });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/vault/change-master-password
router.post(
  "/change-master-password",
  [
    body("currentMasterPassword").notEmpty(),
    body("newMasterPassword").isLength({ min: 8 }).withMessage("New master password must be at least 8 characters."),
  ],
  handleValidation,
  async (req, res, next) => {
    try {
      const meta = await prisma.vaultMeta.findUnique({ where: { userId: req.user.id } });
      if (!meta) return res.status(404).json({ error: "Vault has not been set up yet." });

      const { currentMasterPassword, newMasterPassword } = req.body;
      const oldKey = deriveKey(currentMasterPassword, meta.salt);
      if (!verifyCheckValue(meta.checkCiphertext, meta.checkIv, meta.checkAuthTag, oldKey)) {
        return res.status(401).json({ error: "Current master password is incorrect." });
      }

      const entries = await prisma.vaultEntry.findMany({ where: { userId: req.user.id } });
      const newSalt = generateSalt();
      const newKey = deriveKey(newMasterPassword, newSalt);

      // Re-encrypt every entry with the new key before swapping the salt/check value
      await prisma.$transaction(async (tx) => {
        for (const entry of entries) {
          const password = decrypt(entry.passwordCiphertext, entry.passwordIv, entry.passwordAuthTag, oldKey);
          const passEnc = encrypt(password, newKey);

          let notesUpdate = {};
          if (entry.notesCiphertext) {
            const notes = decrypt(entry.notesCiphertext, entry.notesIv, entry.notesAuthTag, oldKey);
            const notesEnc = encrypt(notes, newKey);
            notesUpdate = { notesCiphertext: notesEnc.ciphertext, notesIv: notesEnc.iv, notesAuthTag: notesEnc.authTag };
          }

          await tx.vaultEntry.update({
            where: { id: entry.id },
            data: {
              passwordCiphertext: passEnc.ciphertext,
              passwordIv: passEnc.iv,
              passwordAuthTag: passEnc.authTag,
              ...notesUpdate,
            },
          });
        }

        const newCheck = buildCheckValue(newKey);
        await tx.vaultMeta.update({
          where: { userId: req.user.id },
          data: { salt: newSalt, checkCiphertext: newCheck.ciphertext, checkIv: newCheck.iv, checkAuthTag: newCheck.authTag },
        });
      });

      res.json({ message: "Master password changed. All entries re-encrypted." });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/vault/entries - metadata only, never includes decrypted passwords
router.get("/entries", async (req, res, next) => {
  try {
    const entries = await prisma.vaultEntry.findMany({
      where: { userId: req.user.id },
      select: { id: true, website: true, username: true, createdAt: true, updatedAt: true, notesCiphertext: true },
      orderBy: { website: "asc" },
    });
    res.json(entries.map((e) => ({ ...e, hasNotes: !!e.notesCiphertext, notesCiphertext: undefined })));
  } catch (err) {
    next(err);
  }
});

const entryValidators = [
  body("website").trim().notEmpty().withMessage("Website/service name is required."),
  body("password").notEmpty().withMessage("Password is required."),
  body("masterPassword").notEmpty().withMessage("Master password is required to encrypt this entry."),
];

async function getDerivedKeyOrFail(userId, masterPassword) {
  const meta = await prisma.vaultMeta.findUnique({ where: { userId } });
  if (!meta) throw Object.assign(new Error("Vault has not been set up yet."), { status: 404 });
  const key = deriveKey(masterPassword, meta.salt);
  if (!verifyCheckValue(meta.checkCiphertext, meta.checkIv, meta.checkAuthTag, key)) {
    throw Object.assign(new Error("Incorrect master password."), { status: 401 });
  }
  return key;
}

// POST /api/vault/entries
router.post("/entries", entryValidators, handleValidation, async (req, res, next) => {
  try {
    const { website, username, password, notes, masterPassword } = req.body;
    const key = await getDerivedKeyOrFail(req.user.id, masterPassword);

    const passEnc = encrypt(password, key);
    const notesEnc = notes ? encrypt(notes, key) : null;

    const entry = await prisma.vaultEntry.create({
      data: {
        userId: req.user.id,
        website,
        username: username || null,
        passwordCiphertext: passEnc.ciphertext,
        passwordIv: passEnc.iv,
        passwordAuthTag: passEnc.authTag,
        ...(notesEnc && { notesCiphertext: notesEnc.ciphertext, notesIv: notesEnc.iv, notesAuthTag: notesEnc.authTag }),
      },
      select: { id: true, website: true, username: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/vault/entries/:id
router.put("/entries/:id", entryValidators, handleValidation, async (req, res, next) => {
  try {
    const existing = await prisma.vaultEntry.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Vault entry not found." });

    const { website, username, password, notes, masterPassword } = req.body;
    const key = await getDerivedKeyOrFail(req.user.id, masterPassword);

    const passEnc = encrypt(password, key);
    const notesEnc = notes ? encrypt(notes, key) : null;

    const entry = await prisma.vaultEntry.update({
      where: { id: req.params.id },
      data: {
        website,
        username: username || null,
        passwordCiphertext: passEnc.ciphertext,
        passwordIv: passEnc.iv,
        passwordAuthTag: passEnc.authTag,
        notesCiphertext: notesEnc ? notesEnc.ciphertext : null,
        notesIv: notesEnc ? notesEnc.iv : null,
        notesAuthTag: notesEnc ? notesEnc.authTag : null,
      },
      select: { id: true, website: true, username: true, createdAt: true, updatedAt: true },
    });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// POST /api/vault/entries/:id/reveal - decrypts a single entry's password (and notes) on demand
router.post(
  "/entries/:id/reveal",
  [body("masterPassword").notEmpty().withMessage("Master password is required.")],
  handleValidation,
  async (req, res, next) => {
    try {
      const entry = await prisma.vaultEntry.findFirst({ where: { id: req.params.id, userId: req.user.id } });
      if (!entry) return res.status(404).json({ error: "Vault entry not found." });

      const key = await getDerivedKeyOrFail(req.user.id, req.body.masterPassword);
      const password = decrypt(entry.passwordCiphertext, entry.passwordIv, entry.passwordAuthTag, key);
      const notes = entry.notesCiphertext ? decrypt(entry.notesCiphertext, entry.notesIv, entry.notesAuthTag, key) : null;

      res.json({ password, notes });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/entries/:id", async (req, res, next) => {
  try {
    const existing = await prisma.vaultEntry.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!existing) return res.status(404).json({ error: "Vault entry not found." });
    await prisma.vaultEntry.delete({ where: { id: req.params.id } });
    res.json({ message: "Vault entry deleted." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
