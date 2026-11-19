
const crypto = require("crypto");

const PRODUCTS = {
  ebook: {
    name: "Ebook Digital",
    price: 50000
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }

  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction =
      process.env.MIDTRANS_IS_PRODUCTION === "true";

    if (!serverKey) {
      throw new Error("Payment configuration missing");
    }

    const { productId } = JSON.parse(event.body || "{}");
    const product = PRODUCTS[productId];

    if (!product) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Produk tidak valid" })
      };
    }

    const orderId = `DENI-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const auth = Buffer.from(`${serverKey}:`).toString("base64");

    const response = await fetch(
      `${isProduction
        ? "https://app.midtrans.com"
        : "https://app.sandbox.midtrans.com"
      }/snap/v1/transactions`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: product.price
          },
          item_details: [{
            id: productId,
            price: product.price,
            quantity: 1,
            name: product.name
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          message: "Gagal membuat pembayaran"
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orderId,
        redirect_url: data.redirect_url
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Terjadi kesalahan pada server"
      })
    };
  }
};
