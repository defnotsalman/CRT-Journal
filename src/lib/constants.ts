export const CHECKLIST_SECTIONS = [
  {
    key: "presession",
    title: "01 · Pre-Session",
    items: [
      { id: "p1", text: "Checked high-impact news (NFP, FOMC, CPI) — not trading within 30–60 min of it." },
      { id: "p2", text: "Know the session context (Asian accumulation / London raid / NY distribution)." },
      { id: "p3", text: "Marked HTF anchor candle(s) — Daily / H4 / H1." },
      { id: "p4", text: "Volume Profile pulled up — POC, VAH, VAL, Naked POCs marked." },
      { id: "p5", text: "Max risk and max trade count for today written down before charts." }
    ]
  },
  {
    key: "setup",
    title: "02 · Setup Validity",
    items: [
      { id: "s1", text: "Anchor candle sits at a real level (HTF S/R, prior day/week H-L, or VP level)." },
      { id: "s2", text: "Anchor candle range is institutional-sized, not a tiny doji." },
      { id: "s3", text: "Raid candle wicks clearly beyond CRT-High/Low." },
      { id: "s4", text: "Raid candle closes back inside the range." },
      { id: "s5", text: "Volume Profile confluence exists at the sweep point." },
      { id: "s6", text: "Genuine MSS found on M15/M5." },
      { id: "s7", text: "Setup is with HTF bias or a legitimate reversal zone." },
      { id: "s8", text: "Not the 3rd+ attempt on the same level today." }
    ]
  },
  {
    key: "entry",
    title: "03 · Entry",
    items: [
      { id: "e1", text: "Entry on the retest of MSS swing / OB / FVG, not a chase." },
      { id: "e2", text: "Stop-loss pre-calculated before entry." },
      { id: "e3", text: "Take-profit pre-calculated before entry (realistic level)." },
      { id: "e4", text: "Position size = risk % ÷ stop distance, not picked by feel." },
      { id: "e5", text: "Not entering on impulse — checklist fully satisfied." }
    ]
  },
  {
    key: "risk",
    title: "04 · Risk Management",
    items: [
      { id: "r1", text: "Stop placed structurally (beyond sweep wick / MSS), not to hit a target RR." },
      { id: "r2", text: "Wide structural stop → smaller size, not a tighter stop." },
      { id: "r3", text: "RR target realistic: 1:1.5–1:3." },
      { id: "r4", text: "Risk per trade capped at 0.5–1% of account." },
      { id: "r5", text: "Daily max loss defined (2–3x per-trade risk)." },
      { id: "r6", text: "Stop distance checked against ATR — not tighter than normal noise." },
      { id: "r7", text: "Comfortable with this exact loss amount on a 20-trade sample." }
    ]
  },
  {
    key: "overtrading",
    title: "05 · Overtrading",
    items: [
      { id: "o1", text: "Within max 1–3 trades for today." },
      { id: "o2", text: "Only one CRT attempt on this level." },
      { id: "o3", text: "Not on a 2-consecutive-loss streak today." },
      { id: "o4", text: "Trading one pair/instrument, not scanning many charts." },
      { id: "o5", text: "This setup came from the checklist, not excitement over a wick." }
    ]
  },
  {
    key: "posttrade",
    title: "06 · Post-Trade",
    items: [
      { id: "t1", text: "Entry and exit screenshots attached." },
      { id: "t2", text: "Honestly reviewed whether every rule above was followed." },
      { id: "t3", text: "Classified as a 'good loss' or 'process loss' if it lost." },
      { id: "t4", text: "Not about to revenge trade right now." },
      { id: "did_follow_rules", text: "CRITICAL: I followed my rules exactly (used for streak calculation)." }
    ]
  }
];
