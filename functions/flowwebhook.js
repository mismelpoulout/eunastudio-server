const crypto = require("crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const FLOW_SECRET = defineSecret("FLOW_SECRET");

exports.flowwebhook = onRequest(
  { secrets: [FLOW_SECRET], region: "us-central1" },
  async (req, res) => {
    const secretKey = FLOW_SECRET.value();
    const params = { ...req.body };
    const receivedSignature = params.s;
    delete params.s;

    try {
      const sortedKeys = Object.keys(params).sort();
      const stringToSign = sortedKeys.map(k => `${k}${params[k]}`).join("");
      const expectedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(stringToSign)
        .digest("hex");

      console.log("🧾 stringToSign (webhook):", stringToSign);
      console.log("🔐 Firma esperada:", expectedSignature);
      console.log("📥 Firma recibida:", receivedSignature);

      if (expectedSignature !== receivedSignature) {
        console.warn("⚠️ Firma inválida (pero respondemos OK para Flow)");
      } else {
        console.log("✅ Firma válida");
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Error en webhook:", err);
      // Aun así respondemos 200 para que Flow no falle
      return res.status(200).send("OK");
    }
  }
);