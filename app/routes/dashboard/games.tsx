import { useState } from 'react';
import { redirect } from 'react-router';
import { callTrpc } from '~/utils/trpc.server';
import { TicTacToe } from '~/components/games/TicTacToe';
import { LeaderboardCard } from '~/components/games/LeaderboardCard';
import { AchievementGrid } from '~/components/games/AchievementCard';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Gamepad2, Trophy, Star, Users } from 'lucide-react';

export async function loader({ request }: { request: Request }) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect('/login');
  }

  // Fetch games data
  const games = await caller.games.listGames({
    limit: 10,
  });

  const userAchievements = user?.id
    ? await caller.games.listAchievements({
        userId: user.id,
      })
    : [];

  return {
    user,
    games: games.items,
    achievements: userAchievements,
  };
}

export default function GamesPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gameScores, setGameScores] = useState<{ X: number; O: number }>({
    X: 0,
    O: 0,
  });

  const handleGameEnd = (winner: 'X' | 'O' | null) => {
    if (winner) {
      setGameScores(prev => ({
        ...prev,
        [winner]: prev[winner] + 1,
      }));
    }
  };

  // Sample achievements for demonstration
  const sampleAchievements = [
    {
      id: '1',
      name: 'First Win',
      description: 'Win your first game',
      icon: '🏆',
      category: 'games',
      points: 10,
      unlocked: true,
      unlockedAt: new Date(),
    },
    {
      id: '2',
      name: 'Win Streak',
      description: 'Win 5 games in a row',
      icon: '🔥',
      category: 'games',
      points: 25,
      unlocked: false,
    },
    {
      id: '3',
      name: 'Leaderboard Leader',
      description: 'Reach #1 on the leaderboard',
      icon: '👑',
      category: 'games',
      points: 50,
      unlocked: false,
    },
    {
      id: '4',
      name: 'Game Master',
      description: 'Play 10 different games',
      icon: '🎮',
      category: 'games',
      points: 30,
      unlocked: true,
      unlockedAt: new Date(),
    },
    {
      id: '5',
      name: 'Social Butterfly',
      description: 'Play 10 games with other family members',
      icon: '🦋',
      category: 'social',
      points: 20,
      unlocked: false,
    },
    {
      id: '6',
      name: 'Unbeatable',
      description: 'Win 50 games',
      icon: '⚡',
      category: 'games',
      points: 100,
      unlocked: false,
    },
  ];

  // Sample leaderboard data
  const sampleLeaderboard = [
    {
      rank: 1,
      userId: '1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      score: 2850,
    },
    {
      rank: 2,
      userId: '2',
      firstName: 'Mike',
      lastName: 'Johnson',
      score: 2650,
    },
    {
      rank: 3,
      userId: '3',
      firstName: 'Emma',
      lastName: 'Johnson',
      score: 2420,
    },
    {
      rank: 4,
      userId: '4',
      firstName: 'Tom',
      lastName: 'Johnson',
      score: 2150,
    },
    {
      rank: 5,
      userId: '5',
      firstName: 'Lisa',
      lastName: 'Johnson',
      score: 1920,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Gamepad2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Games & Entertainment</h1>
          </div>
          <p className="text-lg text-gray-600">
            Play games with family, climb the leaderboard, and unlock achievements
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Games Played</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Gamepad2 className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Points</p>
                <p className="text-2xl font-bold">450</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Achievements</p>
                <p className="text-2xl font-bold">4/6</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Rank</p>
                <p className="text-2xl font-bold">#3</p>
              </div>
              <Users className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Available Games</h2>

              {/* Game Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div
                  onClick={() => setActiveGame('tictactoe')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    activeGame === 'tictactoe'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">⭕</div>
                  <h3 className="font-bold mb-1">Tic Tac Toe</h3>
                  <p className="text-sm text-gray-600">Classic 2-player game</p>
                  <p className="text-xs text-gray-500 mt-2">2 players • 5-10 min</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 opacity-50">
                  <div className="text-3xl mb-2">🧩</div>
                  <h3 className="font-bold mb-1">Trivia</h3>
                  <p className="text-sm text-gray-600">Coming soon</p>
                  <p className="text-xs text-gray-500 mt-2">2-4 players • 10 min</p>
                </div>

                <div className="p-4 rounded-lg border-2 border-gray-200 opacity-50">
                  <div className="text-3xl mb-2">🃏</div>
                  <h3 className="font-bold mb-1">Card Game</h3>
                  <p className="text-sm text-gray-600">Coming soon</p>
                  <p className="text-xs text-gray-500 mt-2">2+ players • 15 min</p>
                </div>
              </div>

              {/* Active Game */}
              {activeGame === 'tictactoe' && (
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <TicTacToe
                    playerXName="You"
                    playerOName="Family Member"
                    onGameEnd={handleGameEnd}
                  />
                </div>
              )}

              {!activeGame && (
                <div className="text-center py-8 text-gray-600">
                  <p>Select a game above to start playing!</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LeaderboardCard
                  title="Tic Tac Toe Champions"
                  entries={sampleLeaderboard}
                  period="all-time"
                />
              </div>

              <div className="space-y-4">
                <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <h3 className="font-bold mb-2">🏆 Your Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Games Played</span>
                      <span className="font-bold">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Win Rate</span>
                      <span className="font-bold">75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Highest Score</span>
                      <span className="font-bold">2,850</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-bold mb-3">🎮 Other Leaderboards</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start text-sm">
                      This Month
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-sm">
                      This Week
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements">
            <Card className="p-6">
              <AchievementGrid achievements={sampleAchievements} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
