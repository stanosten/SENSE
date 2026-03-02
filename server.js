const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const rateState = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const getClientKey = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
};

const isRateLimited = (key) => {
  const now = Date.now();
  const existing = rateState.get(key) || [];
  const filtered = existing.filter((ts) => now - ts < RATE_WINDOW_MS);
  filtered.push(now);
  rateState.set(key, filtered);
  return filtered.length > RATE_MAX;
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const isValidEmail = (value) => {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;
  if (!host || !user || !pass || !port) return null;
  return { host, user, pass, port, secure };
};

app.post("/api/lead", upload.single("photo"), async (req, res) => {
  const key = getClientKey(req);
  if (isRateLimited(key)) {
    res.status(429).json({ ok: false, message: "rate_limited" });
    return;
  }

  const {
    name,
    phone,
    email,
    style,
    size,
    people,
    message,
    lacquer,
    gel,
    total,
    company,
    form_started_at,
  } = req.body || {};

  if (company && String(company).trim()) {
    res.status(200).json({ ok: true });
    return;
  }

  const startedAt = Number(form_started_at || 0);
  if (startedAt && Date.now() - startedAt < 1500) {
    res.status(400).json({ ok: false, message: "too_fast" });
    return;
  }

  const safeName = String(name || "").trim();
  const safePhone = normalizePhone(phone);
  const safeEmail = String(email || "").trim();
  const safeStyle = String(style || "").trim();
  const safeSize = String(size || "").trim();
  const safePeople = Number(people || 0);
  const safeMessage = String(message || "").trim();
  const safeTotal = String(total || "").trim();
  const safeLacquer = lacquer ? "Да" : "Нет";
  const safeGel = gel ? "Да" : "Нет";

  if (safeName.length < 2) {
    res.status(400).json({ ok: false, message: "invalid_name" });
    return;
  }
  if (safePhone.length !== 11 || !safePhone.startsWith("7")) {
    res.status(400).json({ ok: false, message: "invalid_phone" });
    return;
  }
  if (!isValidEmail(safeEmail)) {
    res.status(400).json({ ok: false, message: "invalid_email" });
    return;
  }
  if (!safeStyle) {
    res.status(400).json({ ok: false, message: "invalid_style" });
    return;
  }
  if (!Number.isFinite(safePeople) || safePeople < 1) {
    res.status(400).json({ ok: false, message: "invalid_people" });
    return;
  }
  if (!safeSize) {
    res.status(400).json({ ok: false, message: "invalid_size" });
    return;
  }

  const smtp = getSmtpConfig();
  if (!smtp) {
    res.status(500).json({ ok: false, message: "smtp_not_configured" });
    return;
  }

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const to = process.env.MAIL_TO || "aleksander.osten@ya.ru";
  const from = process.env.MAIL_FROM || smtp.user;
  const subject = "Новая заявка с сайта SENSE";
  const text = [
    `Имя: ${safeName}`,
    `Телефон: ${safePhone}`,
    `Email: ${safeEmail}`,
    `Стиль: ${safeStyle}`,
    `Размер: ${safeSize}`,
    `Лиц: ${safePeople}`,
    `Покрытие лаком: ${safeLacquer}`,
    `Покрытие гелем: ${safeGel}`,
    `Итоговая стоимость: ${safeTotal ? `${safeTotal} р.` : "—"}`,
    `Пожелания: ${safeMessage || "—"}`,
  ].join("\n");
  const html = [
    `<p><strong>Имя:</strong> ${safeName}</p>`,
    `<p><strong>Телефон:</strong> ${safePhone}</p>`,
    `<p><strong>Email:</strong> ${safeEmail}</p>`,
    `<p><strong>Стиль:</strong> ${safeStyle}</p>`,
    `<p><strong>Размер:</strong> ${safeSize}</p>`,
    `<p><strong>Лиц:</strong> ${safePeople}</p>`,
    `<p><strong>Покрытие лаком:</strong> ${safeLacquer}</p>`,
    `<p><strong>Покрытие гелем:</strong> ${safeGel}</p>`,
    `<p><strong>Итоговая стоимость:</strong> ${safeTotal ? `${safeTotal} р.` : "—"}</p>`,
    `<p><strong>Пожелания:</strong> ${safeMessage || "—"}</p>`,
  ].join("");

  const attachments = [];
  if (req.file && req.file.buffer && req.file.originalname) {
    attachments.push({
      filename: req.file.originalname,
      content: req.file.buffer,
      contentType: req.file.mimetype,
    });
  }

  try {
    await transport.sendMail({
      from,
      to,
      replyTo: safeEmail,
      subject,
      text,
      html,
      attachments,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: "send_failed" });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port);
