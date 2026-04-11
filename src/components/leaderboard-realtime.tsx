"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Member {
  user_id: string;
  username: string;
  total_points: number;
}

interface Props {
  quinielaId: string;
  currentUserId: string;
  initialMembers: Member[];
}

export function LeaderboardRealtime({ quinielaId, currentUserId, initialMembers }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`leaderboard:${quinielaId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiniela_members",
          filter: `quiniela_id=eq.${quinielaId}`,
        },
        async () => {
          // Al detectar cambio, re-fetch el leaderboard completo con usernames
          const { data } = await supabase
            .from("quiniela_members")
            .select(`total_points, user_id, profiles(username)`)
            .eq("quiniela_id", quinielaId)
            .order("total_points", { ascending: false });

          if (data) {
            setMembers(
              data.map((m) => ({
                user_id: m.user_id,
                username: (m.profiles as unknown as { username: string })?.username ?? "—",
                total_points: m.total_points,
              }))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quinielaId]);

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {members.map((m, i) => {
            const isCurrentUser = m.user_id === currentUserId;
            return (
              <li
                key={m.user_id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isCurrentUser ? "bg-primary/5" : ""
                }`}
              >
                <span
                  className={`w-5 text-center text-sm font-bold ${
                    i === 0
                      ? "text-yellow-500"
                      : i === 1
                        ? "text-gray-400"
                        : i === 2
                          ? "text-amber-600"
                          : "text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {m.username}
                  {isCurrentUser && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>
                  )}
                </span>
                <Badge
                  variant={i === 0 ? "default" : "secondary"}
                  className="font-bold tabular-nums"
                >
                  {m.total_points} pts
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
