"use client";

import { useState } from 'react';

interface CreditRecommendation {
  decision: 'APPROVE' | 'CONDITIONAL' | 'DECLINE' | 'REVIEW';
  creditLimit: number;
  paymentTerms: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string;
  conditions?: string[];
  additionalNotes?: string;
}

interface CreditAnalysisResult {
  applicationId: number;
  analysis: CreditRecommendation;
  analyzedAt: string;
  model: string;
}

interface CreditAnalysisProps {
  applicationId: number;
}

export default function CreditAnalysis({ applicationId }: CreditAnalysisProps) {
  const [analysis, setAnalysis] = useState<CreditAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeCredit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/credit-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze credit');
      }

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (err) {
      console.error('Credit analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze credit');
    } finally {
      setIsLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return 'text-green-600 bg-green-50 border-green-200';
      case 'CONDITIONAL': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'DECLINE': return 'text-red-600 bg-red-50 border-red-200';
      case 'REVIEW': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI Credit Analysis</h2>
            <p className="text-gray-600">Powered by GPT-4 mini</p>
          </div>
        </div>
        
        <button
          onClick={analyzeCredit}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            'Analyze Credit'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Decision Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border-2 ${getDecisionColor(analysis.analysis.decision)}`}>
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-1">Decision</h3>
              <p className="text-2xl font-bold">{analysis.analysis.decision}</p>
            </div>
            
            <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50">
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-1 text-green-800">Credit Limit</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(analysis.analysis.creditLimit)}</p>
            </div>
            
            <div className={`p-4 rounded-xl ${getRiskColor(analysis.analysis.riskLevel)}`}>
              <h3 className="font-semibold text-sm uppercase tracking-wide mb-1">Risk Level</h3>
              <p className="text-2xl font-bold">{analysis.analysis.riskLevel}</p>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Recommended Payment Terms</h3>
            <p className="text-blue-700 font-medium">{analysis.analysis.paymentTerms}</p>
          </div>

          {/* Reasoning */}
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analysis Reasoning
            </h3>
            <p className="text-gray-700 leading-relaxed">{analysis.analysis.reasoning}</p>
          </div>

          {/* Conditions (if any) */}
          {analysis.analysis.conditions && analysis.analysis.conditions.length > 0 && (
            <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Conditions for Approval
              </h3>
              <ul className="space-y-2">
                {analysis.analysis.conditions.map((condition, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></span>
                    <span className="text-yellow-700">{condition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional Notes */}
          {analysis.analysis.additionalNotes && (
            <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-200">
              <h3 className="font-semibold text-indigo-800 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Additional Notes
              </h3>
              <p className="text-indigo-700">{analysis.analysis.additionalNotes}</p>
            </div>
          )}

          {/* Analysis Metadata */}
          <div className="text-sm text-gray-500 border-t pt-4">
            <p>Analysis completed on {new Date(analysis.analyzedAt).toLocaleString()}</p>
            <p>Model: {analysis.model}</p>
          </div>
        </div>
      )}
    </div>
  );
} 