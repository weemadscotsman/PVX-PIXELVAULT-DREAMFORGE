import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { 
  Share2, 
  Plus,
  ArrowUpRight,
  Clock,
  LineChart,
  Calendar
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Example staking data
const stakingData = {
  totalStaked: 120000,
  activeStakes: 3,
  rewards: 3245.21,
  stakingPower: 85,
  apy: 12.4,
  lockupPeriods: [
    { id: 1, name: '30 Days', apy: 8.2 },
    { id: 2, name: '90 Days', apy: 12.4 },
    { id: 3, name: '180 Days', apy: 16.8 },
    { id: 4, name: '365 Days', apy: 22.5 },
  ],
  activeStakesList: [
    { id: 1, amount: 50000, startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60), apy: 12.4, rewards: 1245.65 },
    { id: 2, amount: 35000, startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 165), apy: 16.8, rewards: 985.32 },
    { id: 3, amount: 35000, startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25), apy: 8.2, rewards: 1014.24 },
  ]
};

export default function StakingPage() {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M μPVX`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K μPVX`;
    } else {
      return `${value.toFixed(2)} μPVX`;
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (endDate: Date) => {
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-300 text-shadow-neon">
            <Share2 className="inline-block mr-2 h-6 w-6" /> 
            PVX Staking Portal
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-black/70 border-blue-900/50 h-full">
              <CardHeader className="border-b border-blue-900/30 bg-blue-900/10">
                <CardTitle className="text-blue-300">Your Active Stakes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {stakingData.activeStakesList.map((stake) => (
                    <div key={stake.id} className="bg-gray-900/30 p-4 rounded border border-blue-900/20">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-lg font-bold text-blue-300">{formatCurrency(stake.amount)}</p>
                          <div className="flex items-center mt-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{getDaysRemaining(stake.endDate)} days remaining</span>
                          </div>
                        </div>
                        <div className="bg-green-900/30 px-3 py-1 rounded text-green-400 text-sm font-bold">
                          {stake.apy}% APY
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-400">Start Date</p>
                          <p className="text-sm text-gray-300">{formatDate(stake.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">End Date</p>
                          <p className="text-sm text-gray-300">{formatDate(stake.endDate)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-blue-950/30 p-3 rounded">
                        <div className="flex justify-between mb-1">
                          <p className="text-xs text-gray-400">Earned Rewards</p>
                          <p className="text-xs text-green-400">+ {formatCurrency(stake.rewards)}</p>
                        </div>
                        <Progress value={65} className="h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-blue-900/30 bg-blue-900/10 py-4">
                <Button className="w-full bg-blue-700 hover:bg-blue-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Stake
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="bg-black/70 border-blue-900/50">
              <CardHeader className="border-b border-blue-900/30 bg-blue-900/10">
                <CardTitle className="text-blue-300">Staking Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Staked</p>
                    <p className="text-2xl font-bold text-blue-300">{formatCurrency(stakingData.totalStaked)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/30 p-3 rounded">
                      <p className="text-xs text-gray-400">Active Stakes</p>
                      <p className="text-lg font-bold text-blue-300">{stakingData.activeStakes}</p>
                    </div>
                    <div className="bg-gray-900/30 p-3 rounded">
                      <p className="text-xs text-gray-400">Current APY</p>
                      <p className="text-lg font-bold text-green-400">{stakingData.apy}%</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/30 p-3 rounded">
                    <div className="flex justify-between mb-1">
                      <p className="text-xs text-gray-400">Staking Power</p>
                      <p className="text-xs text-blue-300">{stakingData.stakingPower}%</p>
                    </div>
                    <Progress value={stakingData.stakingPower} className="h-2" />
                  </div>
                  
                  <div className="bg-blue-950/20 p-3 rounded border border-blue-900/30">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-300">Total Rewards</p>
                      <p className="text-sm font-bold text-green-400">+ {formatCurrency(stakingData.rewards)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-black/70 border-blue-900/50">
              <CardHeader className="border-b border-blue-900/30 bg-blue-900/10">
                <CardTitle className="text-blue-300">Available Lockup Periods</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {stakingData.lockupPeriods.map((period) => (
                    <div key={period.id} className="flex justify-between items-center bg-gray-900/30 p-3 rounded hover:bg-gray-900/50 transition-colors cursor-pointer">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-400 mr-2" />
                        <p className="text-sm text-gray-300">{period.name}</p>
                      </div>
                      <div className="bg-green-900/30 px-2 py-0.5 rounded text-green-400 text-xs font-bold">
                        {period.apy}% APY
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}