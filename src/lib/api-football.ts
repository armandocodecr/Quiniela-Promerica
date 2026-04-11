// ESPN unofficial API — no key required, datos en tiempo real
const ESPN_STANDINGS_BASE = "https://site.api.espn.com/apis/v2/sports/soccer/crc.1";
const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/crc.1";

export interface Standing {
  rank: number;
  team: { id: string; name: string; logo: string };
  points: number;
  goalsDiff: number;
  form: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export async function getStandings(): Promise<Standing[]> {
  const res = await fetch(`${ESPN_STANDINGS_BASE}/standings`, {
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
  const data = await res.json();

  const group = data.children?.[0];
  if (!group) return [];

  return group.standings.entries.map((entry: ESPNEntry, i: number) => {
    const s = Object.fromEntries(
      entry.stats.map((st: ESPNStat) => [st.name, st.value ?? 0])
    );
    return {
      rank: i + 1,
      team: {
        id: entry.team.id,
        name: entry.team.displayName,
        logo: entry.team.logos?.[0]?.href ?? "",
      },
      points: s.points ?? 0,
      goalsDiff: s.pointDifferential ?? 0,
      form: "",
      all: {
        played: s.gamesPlayed ?? 0,
        win: s.wins ?? 0,
        draw: s.ties ?? 0,
        lose: s.losses ?? 0,
        goals: {
          for: s.pointsFor ?? 0,
          against: s.pointsAgainst ?? 0,
        },
      },
    } satisfies Standing;
  });
}

// --- Fixtures ---

export interface Fixture {
  fixture: {
    id: string;
    date: string;
    status: { short: string };
  };
  teams: {
    home: { id: string; name: string; logo: string };
    away: { id: string; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  league: { round: string };
}

export async function getFixtures(date?: string): Promise<Fixture[]> {
  const url = date
    ? `${ESPN_SCOREBOARD_BASE}/scoreboard?dates=${date}`
    : `${ESPN_SCOREBOARD_BASE}/scoreboard`;
  const res = await fetch(url, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`ESPN scoreboard error: ${res.status}`);
  const data = await res.json();

  return (data.events ?? []).map((event: ESPNEvent) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c: ESPNCompetitor) => c.homeAway === "home");
    const away = comp.competitors.find((c: ESPNCompetitor) => c.homeAway === "away");
    const finished = comp.status?.type?.completed ?? false;

    return {
      fixture: {
        id: event.id,
        date: event.date,
        status: { short: finished ? "FT" : comp.status?.type?.shortDetail ?? "" },
      },
      teams: {
        home: {
          id: home?.team.id ?? "",
          name: home?.team.displayName ?? "",
          logo: home?.team.logo ?? "",
        },
        away: {
          id: away?.team.id ?? "",
          name: away?.team.displayName ?? "",
          logo: away?.team.logo ?? "",
        },
      },
      goals: {
        home: finished ? Number(home?.score) : null,
        away: finished ? Number(away?.score) : null,
      },
      league: { round: event.season?.slug ?? "" },
    } satisfies Fixture;
  });
}

// ESPN response types
interface ESPNEntry {
  team: { id: string; displayName: string; logos?: { href: string }[] };
  stats: ESPNStat[];
}
interface ESPNStat {
  name: string;
  value?: number;
  displayValue?: string;
}
interface ESPNEvent {
  id: string;
  date: string;
  season?: { slug: string };
  competitions: ESPNCompetition[];
}
interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status?: { type?: { completed?: boolean; shortDetail?: string } };
}
interface ESPNCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: { id: string; displayName: string; logo: string };
}
