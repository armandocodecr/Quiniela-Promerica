import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type Standing } from "@/lib/api-football";

interface StandingsTableProps {
  standings: Standing[];
}

const POSITION_COLOR = (i: number, len: number) => {
  if (i < 3) return "bg-yellow-400";
  if (i >= len - 2) return "bg-red-500";
  return "bg-transparent";
};

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <>
      {/* ── Móvil: tarjetas ─────────────────────────────── */}
      <ul className="md:hidden divide-y divide-border">
        {standings.map((s, i) => {
          const isTop3 = i < 3;
          const isLast2 = i >= standings.length - 2;
          return (
            <li key={s.team.id} className="flex items-center gap-3 px-4 py-3">
              {/* Posición */}
              <div className="flex items-center gap-1.5 w-6 shrink-0">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    isTop3
                      ? i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : "bg-amber-600"
                      : isLast2
                        ? "bg-red-500"
                        : "bg-transparent"
                  }`}
                />
                <span className="text-sm font-bold text-muted-foreground">{s.rank}</span>
              </div>

              {/* Logo + nombre */}
              <Image src={s.team.logo} alt={s.team.name} width={26} height={26} className="object-contain shrink-0" />
              <span className="flex-1 text-sm font-medium truncate">{s.team.name}</span>

              {/* Stats compactos */}
              <div className="text-right shrink-0 space-y-0.5">
                <Badge variant={isTop3 ? "default" : "secondary"} className="font-bold tabular-nums">
                  {s.points} pts
                </Badge>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  <span className="text-green-400">{s.all.win}G</span>
                  {" "}<span className="text-yellow-400">{s.all.draw}E</span>
                  {" "}<span className="text-red-400">{s.all.lose}P</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Desktop: tabla completa ──────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-8 text-center font-semibold">#</TableHead>
              <TableHead className="font-semibold">Equipo</TableHead>
              <TableHead className="text-center font-semibold">PJ</TableHead>
              <TableHead className="text-center font-semibold">G</TableHead>
              <TableHead className="text-center font-semibold">E</TableHead>
              <TableHead className="text-center font-semibold">P</TableHead>
              <TableHead className="text-center font-semibold">GF</TableHead>
              <TableHead className="text-center font-semibold">GC</TableHead>
              <TableHead className="text-center font-semibold">DG</TableHead>
              <TableHead className="text-center font-semibold lg:table-cell hidden">Forma</TableHead>
              <TableHead className="text-center font-semibold text-primary">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s, i) => {
              const isTop3 = i < 3;
              const isLast2 = i >= standings.length - 2;
              return (
                <TableRow key={s.team.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {(isTop3 || isLast2) && (
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-600" : "bg-red-500"
                        }`} />
                      )}
                      <span className="text-sm font-medium text-muted-foreground">{s.rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Image src={s.team.logo} alt={s.team.name} width={22} height={22} className="object-contain shrink-0" />
                      <span className="font-medium text-sm">{s.team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{s.all.played}</TableCell>
                  <TableCell className="text-center text-sm text-green-400 font-medium">{s.all.win}</TableCell>
                  <TableCell className="text-center text-sm text-yellow-400 font-medium">{s.all.draw}</TableCell>
                  <TableCell className="text-center text-sm text-red-400 font-medium">{s.all.lose}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{s.all.goals.for}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{s.all.goals.against}</TableCell>
                  <TableCell className="text-center text-sm">
                    <span className={s.goalsDiff > 0 ? "text-green-400 font-medium" : s.goalsDiff < 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                      {s.goalsDiff > 0 ? "+" : ""}{s.goalsDiff}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex gap-0.5 justify-center">
                      {s.form?.slice(-5).split("").map((char, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            char === "W" ? "bg-green-500" : char === "D" ? "bg-yellow-500" : "bg-red-500"
                          }`}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isTop3 ? "default" : "secondary"} className="font-bold tabular-nums">
                      {s.points}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
