const { onRequest } = require("firebase-functions/v2/https");
const { db } = require("../utils/firebase");

exports.validarcodigopromocional = onRequest({}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { code, email } = req.body;

  if (!code || !email) {
    return res.status(400).json({ valido: false, error: "Faltan datos requeridos" });
  }

  try {
    const codigoRef = db.collection("codigosPromocionales").doc(code);
    const codigoSnap = await codigoRef.get();

    if (!codigoSnap.exists) {
      return res.status(200).json({ valido: false });
    }

    const data = codigoSnap.data();
    const yaUsado = data.usados?.includes(email);

    if (yaUsado) {
      return res.status(200).json({ valido: false });
    }

    return res.status(200).json({
      valido: true,
      descuento: data.descuento || 0,
      expira: data.expira || null, // 👈 Esto se valida en el frontend
    });
  } catch (error) {
    console.error("❌ Error al validar código:", error);
    return res.status(500).json({ valido: false, error: "Error del servidor" });
  }
});