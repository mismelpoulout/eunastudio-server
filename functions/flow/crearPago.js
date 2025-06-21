const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

// 🔐 Secretos
const FLOW_API_KEY = defineSecret("FLOW_API_KEY");
const FLOW_URL = defineSecret("FLOW_URL");
const FLOW_SECRET = defineSecret("FLOW_SECRET");

exports.crearpagoflow = onRequest(
  {
    secrets: [FLOW_API_KEY, FLOW_URL, FLOW_SECRET],
    region: "us-central1",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

    const { email, monto, codigo, concepto } = req.body;

    if (!email || !monto) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const finalAmount = parseInt(monto, 10);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: "Monto inválido" });
    }

    try {
      const apiKey = FLOW_API_KEY.value();
      const flowUrl = FLOW_URL.value();
      const secretKey = FLOW_SECRET.value();

      if (!flowUrl || !apiKey || !secretKey) {
        throw new Error("Uno o más secretos están vacíos o mal definidos.");
      }

      const payload = {
        apiKey,
        commerceOrder: `ORD-${Date.now()}`,
        subject: concepto || "Suscripción mensual",
        currency: "CLP",
        amount: finalAmount,
        email,
        urlConfirmation: "https://us-central1-euna-studio.cloudfunctions.net/flowwebhook",
        urlReturn: "https://eunastudio.cl/home",
        optional: `{"email":"${email}","codigo":"${codigo || ""}"}`, // 🛡️ formato fijo y ordenado
      };

      const sortedKeys = Object.keys(payload).sort();
      const stringToSign = sortedKeys
        .filter(key => key !== "s")
        .map(key => `${key}${payload[key]}`)
        .join('');

      console.log("🧾 stringToSign:", stringToSign);

      payload.s = crypto.createHmac("sha256", secretKey).update(stringToSign).digest("hex");

      // Validación opcional de longitud
      if (!payload.s || payload.s.length !== 64) {
        throw new Error("La firma generada no es válida.");
      }

      console.log("🔐 Firma generada:", payload.s);
      console.log("🚀 Payload enviado a Flow:", {
        ...payload,
        apiKey: "*****",
        s: "*****",
      });

      const response = await axios.post(`${flowUrl}/payment/create`, qs.stringify(payload), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!response.data?.url) {
        throw new Error("Flow no devolvió una URL válida.");
      }

      return res.status(200).json({
        url: response.data.url,
        token: response.data.token,
      });

    } catch (error) {
      console.error("❌ Error al crear pago:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });

      return res.status(500).json({
        error: "Error al crear el pago",
        detalle: error.response?.data || error.message,
      });
    }
  }
);