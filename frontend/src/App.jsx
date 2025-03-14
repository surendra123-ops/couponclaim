import { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [message, setMessage] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [stats, setStats] = useState({ total: 0, available: 0, claimed: 0, coupons: [] });
  const [userID, setUserID] = useState("");
  const [claimedCoupons, setClaimedCoupons] = useState([]);

  useEffect(() => {
    const lastClaimTime = localStorage.getItem("lastClaimTime");
    if (lastClaimTime) {
      const elapsed = Math.floor((Date.now() - lastClaimTime) / 1000);
      if (elapsed < 60) {
        setTimeLeft(60 - elapsed);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const fetchStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/stats");
      setStats(res.data);
      setClaimedCoupons(res.data.claimedCoupons);
    } catch (err) {
      console.error("Error fetching stats.");
    }
  };

  const claimCoupon = async () => {
    if (timeLeft > 0) {
      toast.warning(`Please wait ${timeLeft} seconds before claiming again.`);
      return;
    }

    if (!userID.match(/^[a-zA-Z0-9]{1,8}$/)) {
      toast.error("Invalid ID. Use up to 8 letters/numbers only.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/claim", { userID });
      if (res.data.success) {
        setCoupon(res.data.coupon);
        toast.success("Coupon claimed successfully!");
        localStorage.setItem("lastClaimTime", Date.now());
        setTimeLeft(60);
        fetchStats();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Error claiming coupon.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-2xl font-bold mb-4">Round-Robin Coupon System</h1>

      <input
        type="text"
        placeholder="Enter ID (max 8 chars)"
        value={userID}
        onChange={(e) => setUserID(e.target.value)}
        className="px-4 py-2 border rounded mb-4"
      />

      <button
        onClick={claimCoupon}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Claim Coupon
      </button>

      {timeLeft > 0 && (
        <p className="mt-2 text-red-500 font-semibold">Please wait {timeLeft} seconds...</p>
      )}

      {coupon && <p className="mt-2 text-xl font-bold text-green-600">{coupon}</p>}

      <div className="mt-4 text-center">
        <p className="text-lg font-semibold">Total Coupons: {stats.total}</p>
        <p className="text-lg text-green-600">Available: {stats.available}</p>
        <p className="text-lg text-red-600">Claimed: {stats.claimed}</p>
      </div>

      <h2 className="text-xl font-bold mt-4">Available Coupons:</h2>
      <ul className="list-disc">
        {stats.coupons.map((c, index) => (
          <li key={index} className="text-lg">{c}</li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mt-4">Claimed Coupons:</h2>
      <ul className="list-disc">
        {claimedCoupons.map((c, index) => (
          <li key={index} className="text-lg text-red-600">{c.userID} - {c.coupon}</li>
        ))}
      </ul>
    </div>
  );
}
