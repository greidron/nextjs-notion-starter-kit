import { getCurrentContext } from "@/agent/lib/context";
import { NextApiRequest, NextApiResponse } from "next";

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
    const context = await getCurrentContext()

    res.status(200).json(context.messages || [])
}