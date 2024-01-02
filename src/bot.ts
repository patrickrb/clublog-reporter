import { Client, Intents, TextChannel, MessageAttachment } from "discord.js";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import axios, { AxiosResponse } from "axios";
import cheerio from "cheerio";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

type TableRow = string[];
type TableData = TableRow[];

const baseTableData: TableData = [
  [
    "Rank",
    "Callsign",
    "160",
    "80",
    "60",
    "40",
    "30",
    "20",
    "17",
    "15",
    "12",
    "10",
    "6",
    "DXCC",
    "Slots",
    "Range",
  ],
];

function drawTableAndSaveImage(tableData: TableData, filePath: string): void {
  const width = 1000;
  const rowHeight = 35;
  const headerHeight = 35;
  const height = headerHeight + (tableData.length - 1) * rowHeight;

  const canvas = createCanvas(width, height);
  const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

  ctx.fillStyle = "#66ccff";
  ctx.fillRect(0, 0, width, headerHeight);

  // Draw alternating row backgrounds
  for (let i = 0; i < tableData.length; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#555" : "#222"; // Alternate colors
    if (i !== 0)
      ctx.fillRect(0, headerHeight + (i - 1) * rowHeight, width, rowHeight);
  }

  tableData.forEach((row, rowIndex) => {
    const yPos = rowIndex === 0 ? 0 : rowIndex * rowHeight;
    ctx.fillStyle = "#fff";

    row.forEach((cell, cellIndex) => {
      const xPos = cellIndex * (width / row.length);
      ctx.fillText(cell, xPos + 10, yPos + rowHeight / 2);
    });
  });

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filePath, buffer);
}

async function fetchTableData(): Promise<TableData> {
  const formData = {
    fSlotSort: "1",
    fDate: "3",
    fMode: 0,
    fSortBand: 0,
    fDeleted: 0,
    fCfm: 0,
    fClub: 319,
  };

  const response: AxiosResponse = await axios.post(
    "https://clublog.org/league.php?club=319",
    formData,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const $ = cheerio.load(response.data);
  const table = $("table[style='font-size:12px;width:100%;']");
  const rows = table.find("tr");

  const tableData: TableData = [...baseTableData];

  rows.each((i, row) => {
    const cells = $(row).find("td");
    const rowData: TableRow = cells.map((_, cell) => $(cell).text()).get();

    if (rowData.length > 0) {
      tableData.push(rowData);
    }
  });

  return tableData;
}

const token: string = process.env.BOT_TOKEN || "";
const channelId: string = process.env.CHANNEL_ID || "";

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.on("ready", async () => {
  try {
    const channel = (await client.channels.fetch(channelId)) as TextChannel;
    const tableData = await fetchTableData();
    drawTableAndSaveImage(tableData, "table.png");
    const attachment = new MessageAttachment("table.png");
    channel.send({ files: [attachment] });
  } catch (error) {
    console.error("Error:", error);
  }
});

client.login(token);
