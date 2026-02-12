// File thuần TS, dùng chung cho client & server
export const KNOWLEDGE_SUBS = [
  { key: "all",      label: "Tất cả" },
  { key: "can-ban",  label: "Dù lượn căn bản" },
  { key: "nang-cao", label: "Dù lượn nâng cao" },
  { key: "thermal",  label: "Bay thermal" },
  { key: "xc",       label: "Bay XC" },
  { key: "khi-tuong",label: "Khí tượng bay" },
] as const;

export type KnowledgeKey = (typeof KNOWLEDGE_SUBS)[number]["key"];

export const KNOWLEDGE_LABEL: Record<Exclude<KnowledgeKey,"all">, string> = {
  "can-ban":  "Dù lượn căn bản",
  "nang-cao": "Dù lượn nâng cao",
  "thermal":  "Bay thermal",
  "xc":       "Bay XC",
  "khi-tuong":"Khí tượng bay",
};
