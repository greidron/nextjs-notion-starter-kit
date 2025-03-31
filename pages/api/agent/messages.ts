import { getCurrentContext } from "@/agent/lib/context";
import { withSession } from "@/agent/lib/session";
import { AgentApiRequest } from "@/agent/lib/types";
import { compose, withMethod } from "@/agent/lib/utils";
import { NextApiResponse, NextApiHandler } from 'next';

export default (
    compose(
        withSession(),
        withMethod('GET')
    )(
        async (req: AgentApiRequest, res: NextApiResponse) => {
            const context = await getCurrentContext(req.session.id)
            res.status(200).json(context.messages || [])
        }
    )
) as NextApiHandler