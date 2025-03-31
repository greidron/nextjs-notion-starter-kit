import { FunctionTool } from "openai/resources/responses/responses.mjs"

export const schema: FunctionTool = {
    type: 'function',
    name: 'drawChart',
    description: 'draw graph using svg',
    parameters: {
        type: 'object',
        properties: {
            xAxis: {
                type: 'string',
                description: 'X axis label'
            },
            yAxis: {
                type: 'string',
                description: 'Y axis label'
            },
            data: {
                type: 'array',
                description: 'data values',
                items: {
                    type: 'number'
                }
            },
            labels: {
                type: 'array',
                description: 'Array of labels for each data point on the X axis (must match the length of data)',
                items: {
                    type: 'string'
                }
            }
        },
        required: [
            'xAxis', 'yAxis', 'data', 'labels'
        ],
        additionalProperties: false
    },
    strict: true
}

export default function drawChart({
    xAxis, 
    yAxis, 
    data, 
    labels,
}: {
    xAxis: string
    yAxis: string
    data: number[]
    labels: string[]
}) {
    const width = 500;
    const height = 350; // Increased to prevent cropping
    const topPadding = 20;
    const bottomPadding = 60;
    const leftPadding = 60;
    const rightPadding = 20;
    const fontSize = Math.min(height / 30, 10);
    const chartWidth = width - (leftPadding + rightPadding);
    const chartHeight = height - (topPadding + bottomPadding);

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    // Y-axis ticks
    const maxYTicks = 10;
    const roughStep = range / maxYTicks;
    const pow10 = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const niceSteps = [1, 2, 5, 10];
    const step = niceSteps.find(s => s * pow10 >= roughStep) * pow10;
    const yTickStart = Math.floor(minValue / step) * step;
    const yTickEnd = Math.ceil(maxValue / step) * step;
    const yTicksArray = [];
    for (let v = yTickStart; v <= yTickEnd; v += step) {
        yTicksArray.push(v);
    }

    // X-axis tick labels
    const pointSpacing = chartWidth / (data.length - 1);
    const minLabelSpacing = Math.min(chartWidth / 20, 25);
    const xLabelStep = Math.ceil(minLabelSpacing / pointSpacing);
    const shouldRotate = xLabelStep < 3;

    const points = data.map((value, i) => {
        const x = leftPadding + i * pointSpacing;
        const y = height - bottomPadding - ((value - minValue) / range) * chartHeight;
        return `${x},${y}`;
    }).join(' ');

    const xTicks = labels.map((label, i) => {
        if (i % xLabelStep !== 0) return '';
        const x = leftPadding + i * pointSpacing + Math.min(height / 60, 5);
        const y = height - bottomPadding + fontSize / 2;
        if (shouldRotate) {
        return `<text x="${x}" y="${y}" text-anchor="end" font-size="${fontSize}" transform="rotate(-45, ${x}, ${y}) translate(${fontSize}, -${fontSize / 2})">${label}</text>`;
        } else {
        return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${fontSize}">${label}</text>`;
        }
    }).join('\n');

    const yTicks = yTicksArray.map(value => {
        const y = height - bottomPadding - ((value - minValue) / range) * chartHeight;
        return `<text x="${leftPadding - fontSize}" y="${y + fontSize / 2}" text-anchor="end" font-size="${fontSize}">${value.toFixed(1)}</text>`;
    }).join('\n');

    const xAxisLabel = `<text x="${width / 2}" y="${height - 5}" text-anchor="middle">${xAxis}</text>`;
    const yAxisLabel = `<text x="15" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90, 15, ${height / 2})">${yAxis}</text>`;
    return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" />
        <g>
            <line x1="${leftPadding}" y1="${height - bottomPadding}" x2="${width - rightPadding}" y2="${height - bottomPadding}" stroke="black" />
            <line x1="${leftPadding}" y1="${topPadding}" x2="${leftPadding}" y2="${height - bottomPadding}" stroke="black" />
            ${xAxisLabel}
            ${yAxisLabel}
            ${xTicks}
            ${yTicks}
            <polyline fill="none" stroke="steelblue" stroke-width="2" points="${points}" />
            ${data.map((value, i) => {
            const x = leftPadding + i * pointSpacing;
            const y = height - bottomPadding - ((value - minValue) / range) * chartHeight;
            return `<circle cx="${x}" cy="${y}" r="3" fill="steelblue" data-value="${value}" />`;
            }).join('')}
        </g>
        </svg>
    `;
}