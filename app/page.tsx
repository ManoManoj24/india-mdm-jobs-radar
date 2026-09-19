import Radar from "@/components/Radar";
import data from "@/data/jobs.json";
import type { RadarData } from "@/data/types";
export default function Home() { return <Radar data={data as RadarData} />; }
