const db = require("./src/config/sqlite");

db.run(
  `
  INSERT INTO license
  (
    id,
    office_name,
    license_key,
    expiry_date,
    is_active,
    payload,
    signature
  )
  VALUES
  (?, ?, ?, ?, ?, ?, ?)
  `,
  [
    1,
    "Maged Adel Office",
    "WTHQ73RV-NKH0-XHGE-UC33-D0KP",
    "2035-12-31",
    1,
    '{"office":"Maged Adel Office","type":"LIFETIME","issued_at":"2026-06-12T18:18:41.920Z"}',
    "kNuUzeopBefCDSp1GtxTRo5Z8UaSmw3nyP2xjdVurgckWe/aajhVHzenph0ZIpShoehGjmGzPxVUbF1dsmSGU18VfaZffaVRmLWv2jxOf7rIxMJGMJ9kg/PuM456r8vemNB9R1c5yhgoJmAf/mFCkUkPT63vLqfupCFYH5RyyYBomu4KOIpRfOlbmbvTTYJyhImjI1AWN354q9gNUrNeh+ra0KS+L5OXWYCm6zPYGfpb2wmuRh1erYoLK0fdYFSOn+n8LVNwy3CMUf/1PAuT6/NA8Kf01phoaf/Mtdlgade3UcFPP3iLsTAbmwj+FXXXqYq8WtUMPmZub2PWuDvVqQ==",
  ],
  (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("License imported successfully");
  },
);
