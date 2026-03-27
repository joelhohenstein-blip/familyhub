// Copyright © 2026 Hohenstein. All rights reserved.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '~/utils/auth';
import { trpc } from '~/utils/trpc';
import { Download, TrendingUp, Heart } from 'lucide-react';

interface DonationRecord {
  id: string;
  userId: string;
  amount: number;
  feesAmount: number;
  netAmount: number;
  tierLabel: string;
  status: string;
  createdAt: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export default function AdminDonationsPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalAmount: 0,
    totalFees: 0,
    totalNet: 0,
    averageDonation: 0,
  });

  // Check if user is admin
  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/login');
    }
  }, [isLoaded, user, navigate]);

  // Fetch donations data using tRPC query hook
  const { data: donationsData, isLoading: isFetching } = trpc.payments.getDonations.useQuery(undefined, {
    enabled: isLoaded && !!user,
  });

  useEffect(() => {
    if (donationsData) {
      setDonations(donationsData.donations);
      setStats(donationsData.stats);
      setLoading(false);
    } else if (isFetching) {
      setLoading(true);
    }
  }, [donationsData, isFetching]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Donor Name', 'Email', 'Tier', 'Amount', 'Fees', 'Net Amount', 'Status'];
    const rows = donations.map((d) => {
      const donorName = d.user?.firstName && d.user?.lastName 
        ? `${d.user.firstName} ${d.user.lastName}`
        : d.user?.firstName || 'Unknown';
      return [
        new Date(d.createdAt).toLocaleDateString(),
        donorName,
        d.user?.email || 'N/A',
        d.tierLabel,
        `${(d.amount).toFixed(2)}`,
        `${(d.feesAmount).toFixed(2)}`,
        `${(d.netAmount).toFixed(2)}`,
        d.status,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500" />
            Donations Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Track and manage all donations to FamilyHub</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Donations</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalDonations}</p>
              </div>
              <Heart className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Raised</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">${stats.totalAmount.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-gray-600 text-sm font-medium">Processing Fees</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${stats.totalFees.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-gray-600 text-sm font-medium">Net Received</p>
              <p className="text-2xl font-bold text-green-600 mt-2">${stats.totalNet.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-gray-600 text-sm font-medium">Average Donation</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${stats.averageDonation.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export to CSV
          </button>
        </div>

        {/* Donations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Donor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Fees
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Loading donations...
                    </td>
                  </tr>
                ) : donations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No donations yet
                    </td>
                  </tr>
                ) : (
                  donations.map((donation) => {
                    const donorName = donation.user?.firstName && donation.user?.lastName 
                      ? `${donation.user.firstName} ${donation.user.lastName}`
                      : donation.user?.firstName || 'Unknown';
                    return (
                    <tr key={donation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(donation.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {donorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {donation.user?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {donation.tierLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                        ${donation.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        -${donation.feesAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                        ${donation.netAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {donation.status}
                        </span>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
