import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Check, Clock, AlertTriangle, X, Filter, RefreshCw } from 'lucide-react';

interface UTREntry {
  id: number;
  tx_id: string;
  tx_type: string;
  from_address: string;
  to_address: string;
  amount: string;
  asset_type: string;
  asset_id: string;
  block_height: number | null;
  status: string;
  timestamp: string;
  metadata: Record<string, any>;
  zk_proof: string;
  signature: string;
  gas_fee: string;
  verified: boolean;
}

const txTypeColors: Record<string, string> = {
  transfer: 'bg-blue-100 text-blue-800',
  mining_reward: 'bg-green-100 text-green-800',
  stake: 'bg-purple-100 text-purple-800',
  dex_swap: 'bg-orange-100 text-orange-800',
  governance_vote: 'bg-cyan-100 text-cyan-800',
  nft_mint: 'bg-pink-100 text-pink-800',
  default: 'bg-gray-100 text-gray-800'
};

const formatAddress = (address: string) => {
  if (!address) return '';
  if (address.startsWith('zk_PVX:')) {
    return address; // Keep special addresses intact
  }
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const formatAmount = (amount: string, assetType: string) => {
  // Convert string to number
  const numAmount = parseFloat(amount);
  
  // Format based on asset type
  if (assetType === 'token') {
    // Format PVX tokens with 6 decimal places
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    }).format(numAmount);
  } else if (assetType === 'nft') {
    return numAmount.toString(); // NFTs typically have whole number amounts
  } else {
    return numAmount.toString(); // Default formatting
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'confirmed':
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Confirmed
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1">
          <X className="h-3 w-3" />
          Failed
        </Badge>
      );
    case 'vetoed':
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vetoed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
          {status}
        </Badge>
      );
  }
};

const TransactionTypeFilter = ({ currentType, onTypeChange }: { 
  currentType: string; 
  onTypeChange: (type: string) => void 
}) => {
  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-500" />
      <Select value={currentType} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
          <SelectItem value="mining_reward">Mining Reward</SelectItem>
          <SelectItem value="stake">Stake</SelectItem>
          <SelectItem value="dex_swap">DEX Swap</SelectItem>
          <SelectItem value="governance_vote">Governance Vote</SelectItem>
          <SelectItem value="nft_mint">NFT Mint</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const StatusFilter = ({ currentStatus, onStatusChange }: { 
  currentStatus: string; 
  onStatusChange: (status: string) => void 
}) => {
  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-500" />
      <Select value={currentStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="vetoed">Vetoed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export function UTRList({ wallet, limit = 50 }: { wallet?: string; limit?: number }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Determine the query endpoint based on whether a wallet is provided
  const queryEndpoint = wallet 
    ? `/api/utr/address/${wallet}` 
    : '/api/utr';

  const { data, isLoading, isError, error, refetch } = useQuery<UTREntry[]>({
    queryKey: [queryEndpoint, limit],
    enabled: true,
  });

  // Filter the data based on selected filters
  const filteredData = data?.filter(entry => {
    // Apply type filter
    if (typeFilter !== 'all' && entry.tx_type !== typeFilter) {
      return false;
    }
    
    // Apply status filter
    if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false;
    }
    
    return true;
  }) || [];

  return (
    <Card className="w-full overflow-hidden border border-gray-200 bg-transparent backdrop-blur-sm backdrop-filter bg-opacity-80 rounded-xl shadow-sm">
      <CardHeader className="bg-gradient-to-b from-gray-900/70 to-gray-900/40 text-white p-4 pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Universal Transaction Registry
            </CardTitle>
            <CardDescription className="text-gray-300 mt-1">
              {wallet ? 'Wallet transactions' : 'Recent blockchain activity'}
            </CardDescription>
          </div>
          <div className="flex gap-4">
            <TransactionTypeFilter 
              currentType={typeFilter} 
              onTypeChange={setTypeFilter} 
            />
            <StatusFilter 
              currentStatus={statusFilter} 
              onStatusChange={setStatusFilter} 
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 bg-transparent hover:bg-gray-800"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32 ml-auto" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center p-6 text-gray-500">
            <div className="mb-2">Error loading transactions: {(error as Error)?.message}</div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-6 text-gray-500">
            <div className="mb-2">No transactions found with current filters</div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-900/20">
              <TableRow>
                <TableHead className="text-left pl-5">Type</TableHead>
                <TableHead className="text-left">From</TableHead>
                <TableHead className="text-left">To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-5">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-800/10">
                  <TableCell className="pl-5">
                    <Badge 
                      variant="outline" 
                      className={txTypeColors[entry.tx_type] || txTypeColors.default}
                    >
                      {entry.tx_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatAddress(entry.from_address)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatAddress(entry.to_address)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span>{formatAmount(entry.amount, entry.asset_type)}</span>
                      <span className="text-xs text-gray-500">{entry.asset_id}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500 pr-5">
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default UTRList;