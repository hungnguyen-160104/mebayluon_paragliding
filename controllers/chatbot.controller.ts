import { Request, Response } from "express";
import { answerFromFaq } from "../services/chatbot.service";

export const postAsk = async (req: Request, res: Response) => {
  try {
    const question = (req.body?.question ?? "").toString().trim();
    if (!question) {
      return res.status(400).json({ error: 'Missing "question" in body' });
    }
    const result = await answerFromFaq(question);
    return res.json(result);
  } catch (err: any) {
    console.error("Chatbot error:", err);
    return res
      .status(500)
      .json({ error: "Chatbot internal error", detail: err.message });
  }
};
