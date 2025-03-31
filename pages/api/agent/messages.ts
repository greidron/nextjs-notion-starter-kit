import { getCurrentContext, putContext } from "@/agent/lib/context";
import { withSession } from "@/agent/lib/session";
import { AgentApiRequest, AgentMessage } from "@/agent/lib/types";
import { compose, withMethod } from "@/agent/lib/utils";
import { NextApiResponse, NextApiHandler } from 'next';

const ONE_DAY_MILLIS = 1 * 24 * 60 * 60 * 1000

function isRecentMessage(message: AgentMessage) {
    return message.timestamp && message.timestamp > Date.now() - ONE_DAY_MILLIS
}

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