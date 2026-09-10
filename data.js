/**
 * DueTrack Pro - Default Sample Data & Configuration
 */

const DEFAULT_SETTINGS = {
  userName: "My Account",
  userUpiId: "pramod@upi",
  currencySymbol: "₹",
  theme: "dark"
};

const DEFAULT_PEOPLE = [
  {
    id: "person-xyz",
    name: "Person XYZ (Rahul Sharma)",
    phone: "+91 98765 43210",
    email: "rahul.xyz@example.com",
    notes: "Friend & travel companion - regularly settles at end of month",
    avatarColor: "#6366f1",
    createdAt: "2026-08-01T10:00:00Z"
  },
  {
    id: "person-priya",
    name: "Priya Patel",
    phone: "+91 98123 45678",
    email: "priya.p@example.com",
    notes: "Flatmate - shared utility & grocery expenses",
    avatarColor: "#ec4899",
    createdAt: "2026-08-10T12:00:00Z"
  },
  {
    id: "person-amit",
    name: "Amit Kumar",
    phone: "+91 99000 11223",
    email: "amit.k@example.com",
    notes: "Colleague - team lunches & cab bookings",
    avatarColor: "#10b981",
    createdAt: "2026-08-15T09:30:00Z"
  }
];

const CATEGORIES = [
  { id: "train", name: "Train / Travel Booking", icon: "🚆", color: "#3b82f6" },
  { id: "recharge", name: "Mobile / DTH Recharge", icon: "📱", color: "#8b5cf6" },
  { id: "petty", name: "Petty Cash & Errands", icon: "☕", color: "#f59e0b" },
  { id: "cab", name: "Cab & Auto Fare", icon: "🚕", color: "#eab308" },
  { id: "food", name: "Food & Dining", icon: "🍔", color: "#ef4444" },
  { id: "groceries", name: "Groceries & Supplies", icon: "🛒", color: "#10b981" },
  { id: "utilities", name: "Bills & Utilities", icon: "💡", color: "#06b6d4" },
  { id: "other", name: "Other Expenses", icon: "📦", color: "#64748b" }
];

const PAYMENT_MODES = [
  "UPI (GPay / PhonePe / Paytm)",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Cash"
];

const DEFAULT_EXPENSES = [
  {
    id: "exp-001",
    personId: "person-xyz",
    date: "2026-08-28",
    category: "train",
    title: "IRCTC 3AC Train Ticket (Pune to Mumbai)",
    amount: 1480,
    paidVia: "UPI (GPay / PhonePe / Paytm)",
    referenceNo: "PNR: 8421092831",
    notes: "Booked tatkal ticket as requested over call",
    isSettled: false,
    settlementId: null,
    createdAt: "2026-08-28T08:15:00Z"
  },
  {
    id: "exp-002",
    personId: "person-xyz",
    date: "2026-09-02",
    category: "recharge",
    title: "Jio Prepaid 84-Days 2GB/Day Recharge",
    amount: 749,
    paidVia: "Credit Card",
    referenceNo: "TXN90281048",
    notes: "Annual pack booster request for his secondary SIM",
    isSettled: false,
    settlementId: null,
    createdAt: "2026-09-02T11:30:00Z"
  },
  {
    id: "exp-003",
    personId: "person-xyz",
    date: "2026-09-05",
    category: "petty",
    title: "Station Snacks, Water & Printout of documents",
    amount: 220,
    paidVia: "Cash",
    referenceNo: "",
    notes: "Platform food & emergency printouts",
    isSettled: false,
    settlementId: null,
    createdAt: "2026-09-05T16:20:00Z"
  },
  {
    id: "exp-004",
    personId: "person-xyz",
    date: "2026-09-07",
    category: "cab",
    title: "Uber Cab Booking to Airport",
    amount: 850,
    paidVia: "UPI (GPay / PhonePe / Paytm)",
    referenceNo: "UBER-98212",
    notes: "Cab booked from home to terminal 2",
    isSettled: false,
    settlementId: null,
    createdAt: "2026-09-07T05:45:00Z"
  },
  {
    id: "exp-005",
    personId: "person-xyz",
    date: "2026-08-15",
    category: "food",
    title: "Weekend Dinner at Spice Garden",
    amount: 1100,
    paidVia: "Credit Card",
    referenceNo: "BILL#4409",
    notes: "He asked me to tap my card, promised to settle later",
    isSettled: true,
    settlementId: "stl-001",
    createdAt: "2026-08-15T21:00:00Z"
  },
  {
    id: "exp-006",
    personId: "person-priya",
    date: "2026-09-01",
    category: "utilities",
    title: "Airtel Xstream Fiber WiFi Bill",
    amount: 943,
    paidVia: "UPI (GPay / PhonePe / Paytm)",
    referenceNo: "AIRTEL-9812",
    notes: "50% split for September month internet",
    isSettled: false,
    settlementId: null,
    createdAt: "2026-09-01T14:10:00Z"
  }
];

const DEFAULT_SETTLEMENTS = [
  {
    id: "stl-001",
    personId: "person-xyz",
    date: "2026-08-20",
    amount: 1100,
    mode: "UPI (GPay / PhonePe / Paytm)",
    referenceNo: "UPI/2390192019/GPay",
    notes: "Settled for the Spice Garden dinner bill",
    createdAt: "2026-08-20T18:00:00Z"
  }
];
