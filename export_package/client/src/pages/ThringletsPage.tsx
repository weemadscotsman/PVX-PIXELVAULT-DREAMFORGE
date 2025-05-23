import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { 
  Heart, 
  Sparkles,
  Shield,
  Zap,
  Flame,
  Brain,
  Star,
  Plus,
  Skull,
  Cloud,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { thringletManager } from '@/lib/thringlet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Sample wallet address for testing
const SAMPLE_WALLET_ADDRESS = '0x7f5c764cbc14f9669b88837ca1490cca17c31607';

export default function ThringletsPage() {
  const { toast } = useToast();
  const [thringlets, setThringlets] = useState<any[]>([]);
  const [selectedThringlet, setSelectedThringlet] = useState<any>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Initialize thringlets
  useEffect(() => {
    // Initialize with default Thringlets if none exist
    thringletManager.initializeDefaultThringlets(SAMPLE_WALLET_ADDRESS);
    
    // Process time decay to update emotional states
    thringletManager.processAllTimeDecay();
    
    // Get all Thringlets
    const allThringlets = thringletManager.getAllThringlets().map(t => t.getState());
    setThringlets(allThringlets);
    
    if (allThringlets.length > 0) {
      setSelectedThringlet(allThringlets[0]);
    }
    
    // Set up periodic decay processing
    const interval = setInterval(() => {
      thringletManager.processAllTimeDecay();
      refreshThringlets();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Refresh the Thringlet data
  const refreshThringlets = () => {
    const updatedThringlets = thringletManager.getAllThringlets().map(t => t.getState());
    setThringlets(updatedThringlets);
    
    if (selectedThringlet) {
      const updatedSelected = updatedThringlets.find(t => t.id === selectedThringlet.id);
      if (updatedSelected) {
        setSelectedThringlet(updatedSelected);
      }
    }
  };
  
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  
  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-600/30';
      case 'rare':
        return 'bg-purple-500/20 text-purple-300 border-purple-600/30';
      case 'common':
        return 'bg-blue-500/20 text-blue-300 border-blue-600/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-600/30';
    }
  };
  
  const getEmotionColor = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'joyful':
        return 'bg-green-500/20 text-green-300 border-green-600/30';
      case 'content':
        return 'bg-teal-500/20 text-teal-300 border-teal-600/30';
      case 'neutral':
        return 'bg-blue-500/20 text-blue-300 border-blue-600/30';
      case 'curious':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-600/30';
      case 'sad':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-600/30';
      case 'angry':
        return 'bg-red-500/20 text-red-300 border-red-600/30';
      case 'corrupted':
        return 'bg-purple-900/20 text-fuchsia-300 border-purple-900/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-600/30';
    }
  };
  
  const getEmotionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="h-8 w-8" />;
      case 'Heart':
        return <Heart className="h-8 w-8" />;
      case 'Brain':
        return <Brain className="h-8 w-8" />;
      case 'Flame':
        return <Flame className="h-8 w-8" />;
      case 'Cloud':
        return <Cloud className="h-8 w-8" />;
      case 'Skull':
        return <Skull className="h-8 w-8" />;
      default:
        return <Brain className="h-8 w-8" />;
    }
  };
  
  // Handle interaction with a Thringlet
  const handleInteraction = (type: string) => {
    if (!selectedThringlet) return;
    
    setLoading(true);
    setInteractionMessage(null);
    
    // Process the interaction
    const result = thringletManager.interactWithThringlet(selectedThringlet.id, type);
    
    // Short delay to simulate processing
    setTimeout(() => {
      if (result) {
        setInteractionMessage(result.message);
        
        if (result.abilityActivated) {
          toast({
            title: "Ability Activated!",
            description: `${result.abilityActivated.name}: ${result.abilityActivated.desc}`,
            variant: "default"
          });
        }
      }
      
      // Refresh Thringlet data
      refreshThringlets();
      setLoading(false);
    }, 500);
  };
  
  // Memory history for selected Thringlet
  const getMemoryHistory = () => {
    if (!selectedThringlet || !selectedThringlet.memory) return [];
    
    return [...selectedThringlet.memory].reverse().slice(0, 5).map(memory => ({
      action: memory.action,
      time: formatTimeAgo(memory.time)
    }));
  };
  
  if (thringlets.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-96 bg-black/70 border-blue-900/50">
            <CardHeader className="border-b border-blue-900/30 bg-blue-900/10">
              <CardTitle className="text-blue-300">No Thringlets Found</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">You don't have any Thringlets in your collection yet.</p>
            </CardContent>
            <CardFooter className="border-t border-blue-900/30 bg-blue-900/10 py-4">
              <Button className="w-full bg-blue-700 hover:bg-blue-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Get Your First Thringlet
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-300 text-shadow-neon">
            <Heart className="inline-block mr-2 h-6 w-6" /> 
            Thringlet Collection
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <Card className="bg-black/70 border-blue-900/50">
              <CardHeader className="border-b border-blue-900/30 bg-blue-900/10">
                <CardTitle className="text-blue-300">Your Thringlets</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {thringlets.map((thringlet) => (
                    <div 
                      key={thringlet.id} 
                      className={`p-4 rounded border border-blue-900/30 cursor-pointer transition-all hover:border-blue-400/50 ${selectedThringlet?.id === thringlet.id ? 'bg-blue-950/30 border-blue-400/70' : 'bg-gray-900/30'}`}
                      onClick={() => setSelectedThringlet(thringlet)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`${thringlet.appearance.color} h-12 w-12 rounded-xl flex items-center justify-center text-white`}>
                          {getEmotionIcon(thringlet.appearance.icon)}
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-300">{thringlet.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className={getRarityColor(thringlet.rarity)}>
                              {thringlet.rarity}
                            </Badge>
                            <Badge variant="outline" className={getEmotionColor(thringlet.emotionLabel)}>
                              {thringlet.emotionLabel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-blue-900/30 bg-blue-900/10 py-4">
                <Button className="w-full bg-blue-700 hover:bg-blue-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Get New Thringlet
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {selectedThringlet && (
            <div className="lg:col-span-2">
              <Card className="bg-black/70 border-blue-900/50 h-full">
                <CardHeader className={`${selectedThringlet.appearance.color} border-b border-blue-900/30`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-white/70">Thringlet Details</p>
                      <CardTitle className="text-white flex items-center">
                        {selectedThringlet.name}
                        <Star className="h-4 w-4 ml-2 text-yellow-300 fill-yellow-300" />
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-black/30 text-white border-white/20">
                        ID: {selectedThringlet.id}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <Tabs defaultValue="overview" className="w-full mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="memory">Memory</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="flex justify-between">
                            <div>
                              <p className="text-sm text-gray-400">Power Level</p>
                              <p className="text-2xl font-bold text-blue-300">{selectedThringlet.powerLevel}</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <p className="text-sm text-gray-400">Last Interaction</p>
                              <p className="text-sm text-gray-300">{formatTimeAgo(selectedThringlet.lastInteraction)}</p>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-2">
                              <p className="text-sm text-gray-400">Bond Level</p>
                              <p className="text-sm text-blue-300">{selectedThringlet.bondLevel}%</p>
                            </div>
                            <Progress value={selectedThringlet.bondLevel} className="h-2" />
                          </div>
                          
                          {/* Corruption level */}
                          <div>
                            <div className="flex justify-between mb-2">
                              <p className="text-sm text-gray-400">Corruption</p>
                              <p className="text-sm text-red-300">{selectedThringlet.corruption}%</p>
                            </div>
                            <div className="h-2 w-full bg-gray-900/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-red-500 to-purple-600" 
                                style={{ width: `${selectedThringlet.corruption}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Abilities */}
                          {selectedThringlet.abilities && selectedThringlet.abilities.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Abilities</p>
                              <div className="grid grid-cols-1 gap-3">
                                {selectedThringlet.abilities.map((ability: any, index: number) => (
                                  <div key={index} className="bg-blue-950/20 p-3 rounded border border-blue-900/30 flex items-center gap-2">
                                    {ability.type === 'terminal_hack' ? (
                                      <Zap className="h-4 w-4 text-blue-400" />
                                    ) : (
                                      <Shield className="h-4 w-4 text-blue-400" />
                                    )}
                                    <div>
                                      <p className="text-sm font-bold text-gray-300">{ability.name}</p>
                                      <p className="text-xs text-gray-400">{ability.desc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          <div className="bg-gray-900/30 p-4 rounded border border-blue-900/30 mb-4">
                            <p className="text-sm text-gray-400 mb-2">Rarity & Emotion</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className={`p-3 rounded ${getRarityColor(selectedThringlet.rarity)}`}>
                                <p className="text-xs opacity-70">Rarity</p>
                                <p className="text-lg font-bold">{selectedThringlet.rarity}</p>
                              </div>
                              <div className={`p-3 rounded ${getEmotionColor(selectedThringlet.emotionLabel)}`}>
                                <p className="text-xs opacity-70">Emotion</p>
                                <p className="text-lg font-bold">{selectedThringlet.emotionLabel}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-blue-950/20 p-4 rounded border border-blue-900/30 flex-1">
                            <p className="text-sm text-gray-400 mb-3">Thringlet Visualization</p>
                            <div className={`${selectedThringlet.appearance.color} rounded-xl h-40 w-full flex items-center justify-center text-white shadow-lg`}>
                              <div className="text-8xl">
                                {getEmotionIcon(selectedThringlet.appearance.icon)}
                              </div>
                            </div>
                            
                            {/* Interaction message */}
                            {interactionMessage && (
                              <div className="mt-4 p-3 bg-gray-900/40 border border-blue-900/20 rounded">
                                <p className="text-gray-300 text-sm">{interactionMessage}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="memory">
                      <div className="space-y-4">
                        <div className="bg-gray-900/30 p-4 rounded border border-blue-900/30">
                          <p className="text-sm text-gray-400 mb-3">Thringlet Memory</p>
                          
                          {getMemoryHistory().length > 0 ? (
                            <div className="space-y-3">
                              {getMemoryHistory().map((memory, index) => (
                                <div key={index} className="flex justify-between items-center border-b border-blue-900/20 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-400" />
                                    <p className="text-sm text-gray-300">
                                      <span className="font-bold">{memory.action}</span> interaction
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-400">{memory.time}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No interaction history yet.</p>
                          )}
                        </div>
                        
                        <div className="bg-blue-950/20 p-4 rounded border border-blue-900/30">
                          <p className="text-sm text-gray-400 mb-3">Personality Core</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-900/30 p-3 rounded">
                              <p className="text-xs text-gray-400">Core</p>
                              <p className="text-sm font-semibold text-blue-300">{selectedThringlet.core || 'Unknown'}</p>
                            </div>
                            <div className="bg-gray-900/30 p-3 rounded">
                              <p className="text-xs text-gray-400">Personality</p>
                              <p className="text-sm font-semibold text-blue-300">{selectedThringlet.personality || 'Undefined'}</p>
                            </div>
                          </div>
                          
                          {/* Lore */}
                          {selectedThringlet.lore && (
                            <div className="mt-4 bg-gray-900/30 p-3 rounded">
                              <p className="text-xs text-gray-400 mb-1">Lore</p>
                              <p className="text-sm text-gray-300">{selectedThringlet.lore}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="border-t border-blue-900/30 bg-blue-900/10 py-4">
                  <div className="w-full grid grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="border-blue-900/50 text-blue-300"
                      onClick={() => handleInteraction('feed')}
                      disabled={loading}
                    >
                      Feed
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-blue-900/50 text-blue-300"
                      onClick={() => handleInteraction('train')}
                      disabled={loading}
                    >
                      Train
                    </Button>
                    <Button 
                      className="bg-blue-700 hover:bg-blue-600 text-white"
                      onClick={() => handleInteraction('talk')}
                      disabled={loading}
                    >
                      Talk
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}