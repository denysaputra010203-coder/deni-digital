
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
      throw new Error("MIDTRANS_SERVER_KEY belum diatur");
    }

    const { productId } = JSON.parse(event.body || "{}");
    const product = PRODUCTS[productId];

    if (!product) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Produk tidak ditemukan" })
      };
    }

    const orderId = `DENI-${Date.now()}`;
    const auth = Buffer.from(`${serverKey}:`).toString("base64");

    const baseUrl = isProduction
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";

    const response = await fetch(
      `${baseUrl}/snap/v1/transactions`,
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

    if (!response.ok || !data.redirect_url) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          message: "Midtrans gagal membuat pembayaran",
          detail: data
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
        message: error.message || "Terjadi kesalahan server"
      })
    };
  }
};
