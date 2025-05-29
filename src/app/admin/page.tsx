"use client";

import { useState, useEffect } from 'react';
import CreditAnalysis from '@/components/CreditAnalysis';

interface Application {
  id: number;
  legalEntityName: string;
  taxEIN: string;
  phoneNo: string;
  buyerNameEmail: string;
  billToCityStateZip: string;
  createdAt: string;
  termsAgreed: boolean;
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/applications');
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Alliance Chemical - Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage customer applications and AI-powered credit analysis
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Applications List */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Customer Applications</h2>
                <p className="text-gray-600">{applications.length} total applications</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {applications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No applications found</p>
                ) : (
                  applications.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApplication(app.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        selectedApplication === app.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-25'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800">{app.legalEntityName}</h3>
                        <span className="text-xs text-gray-500">#{app.id}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                        <div>EIN: {app.taxEIN}</div>
                        <div>Phone: {app.phoneNo}</div>
                        <div>Contact: {app.buyerNameEmail}</div>
                        <div>Location: {app.billToCityStateZip}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          Submitted: {formatDate(app.createdAt)}
                        </div>
                      </div>
                      {app.termsAgreed && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Terms Signed
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Credit Analysis Panel */}
          <div>
            {selectedApplication ? (
              <CreditAnalysis applicationId={selectedApplication} />
            ) : (
              <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Select an Application</h3>
                  <p className="text-gray-500">Choose an application from the list to run AI credit analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 