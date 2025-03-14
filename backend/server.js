import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());

const coupons = ["DISCOUNT10", "SAVE20", "OFFER30", "DEAL40"];
let lastClaimedIndex = 0;
const claimedCoupons = []; // Store claimed coupons in memory
const ipClaims = new Map();
const cookieClaims = new Map();

const IP_BLOCK_TIME = 60000;
const COOKIE_BLOCK_TIME = 60000;

// API to get coupon stats
app.get("/stats", (req, res) => {
  const claimedSet = new Set(claimedCoupons.map((c) => c.coupon));
  
  res.json({
    total: coupons.length,
    claimed: claimedCoupons.length,
    available: coupons.length - claimedCoupons.length,
    coupons: coupons.filter((c) => !claimedSet.has(c)), // Available coupons
    claimedCoupons,
  });
});

// API to claim a coupon
app.post("/claim", (req, res) => {
  const { userID } = req.body;
  const userIP = req.headers["x-forwarded-for"] || req.ip;
  const userSession = req.cookies.sessionID || Math.random().toString(36).slice(2, 9);

  if (!req.cookies.sessionID) {
    res.cookie("sessionID", userSession, { maxAge: COOKIE_BLOCK_TIME });
  }

  if (!userID || !/^[a-zA-Z0-9]{1,8}$/.test(userID)) {
    return res.json({ success: false, message: "Invalid ID. Use up to 8 letters/numbers only." });
  }

  const currentTime = Date.now();

  if (claimedCoupons.some((c) => c.userID === userID)) {
    return res.json({ success: false, message: "You already claimed a coupon." });
  }

  if (ipClaims.has(userIP) && currentTime - ipClaims.get(userIP) < IP_BLOCK_TIME) {
    return res.json({ success: false, message: "Too many claims from this IP. Try again later." });
  }

  if (cookieClaims.has(userSession) && currentTime - cookieClaims.get(userSession) < COOKIE_BLOCK_TIME) {
    return res.json({ success: false, message: "Too many claims from this browser. Try again later." });
  }

  if (claimedCoupons.length >= coupons.length) {
    return res.json({ success: false, message: "No coupons available." });
  }

  let assignedCoupon = coupons[lastClaimedIndex % coupons.length];
  lastClaimedIndex = (lastClaimedIndex + 1) % coupons.length;

  claimedCoupons.push({ userID, coupon: assignedCoupon });

  ipClaims.set(userIP, currentTime);
  cookieClaims.set(userSession, currentTime);

  return res.json({ success: true, coupon: assignedCoupon });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
