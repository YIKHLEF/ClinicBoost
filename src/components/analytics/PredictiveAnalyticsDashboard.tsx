/**
 * Predictive Analytics Dashboard Component
 * 
 * Displays machine learning-powered insights including:
 * - Patient outcome predictions
 * - No-show probability analysis
 * - Revenue forecasting
 * - Risk assessments
 * - Treatment effectiveness analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ChartContainer } from '../charts/ChartComponents';
import { predictiveAnalytics } from '../../lib/analytics/predictive-analytics';
import useTranslation from '../../hooks/useTranslation';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Activity,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import type {
  PatientOutcomePrediction,
  AppointmentNoShowPrediction,
  RevenueForecast,
  PatientRiskAssessment,
  TreatmentEffectivenessAnalysis,
  PredictionModel
} from '../../lib/analytics/predictive-analytics';

interface PredictiveAnalyticsDashboardProps {
  clinicId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

const PredictiveAnalyticsDashboard: React.FC<PredictiveAnalyticsDashboardProps> = ({
  clinicId,
  dateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  }
}) => {
  const { t, tCommon } = useTranslation();

  // State management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'outcomes' | 'noshow' | 'revenue' | 'risk' | 'effectiveness'>('overview');
  const [models, setModels] = useState<{ [key: string]: PredictionModel }>({});
  const [predictions, setPredictions] = useState<{
    outcomes: PatientOutcomePrediction[];
    noShows: AppointmentNoShowPrediction[];
    revenue: RevenueForecast | null;
    risks: PatientRiskAssessment[];
    effectiveness: TreatmentEffectivenessAnalysis[];
  }>({
    outcomes: [],
    noShows: [],
    revenue: null,
    risks: [],
    effectiveness: []
  });

  // Initialize predictive analytics
  useEffect(() => {
    initializePredictiveAnalytics();
  }, [clinicId, dateRange]);

  const initializePredictiveAnalytics = async () => {
    setLoading(true);
    try {
      await predictiveAnalytics.initialize();
      const modelMetrics = predictiveAnalytics.getModelMetrics();
      setModels(modelMetrics);
      
      // Load sample predictions (in real implementation, load actual data)
      await loadPredictions();
    } catch (error) {
      console.error('Failed to initialize predictive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      // Sample data loading (replace with actual API calls)
      const sampleRevenue = await predictiveAnalytics.generateRevenueForecast(
        'month',
        dateRange.start,
        { revenue: [10000, 12000, 11500], patient_count: 150, marketing_budget: 2000 }
      );
      
      setPredictions(prev => ({
        ...prev,
        revenue: sampleRevenue,
        // Add other sample predictions as needed
      }));
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const handleRefresh = () => {
    initializePredictiveAnalytics();
  };

  const handleModelRetrain = async (modelId: string) => {
    try {
      setLoading(true);
      // In real implementation, provide actual training data
      await predictiveAnalytics.retrainModel(modelId, []);
      const updatedMetrics = predictiveAnalytics.getModelMetrics();
      setModels(updatedMetrics);
    } catch (error) {
      console.error('Failed to retrain model:', error);
    } finally {
      setLoading(false);
    }
  };

  // Model performance overview
  const modelOverview = Object.entries(models).map(([id, model]) => ({
    id,
    name: model.name,
    accuracy: model.accuracy,
    status: model.status,
    lastTrained: model.lastTrained,
    type: model.type
  }));

  // Quick stats for overview
  const quickStats = [
    {
      title: 'Active Models',
      value: Object.values(models).filter(m => m.status === 'active').length,
      total: Object.keys(models).length,
      icon: Brain,
      color: 'bg-blue-500'
    },
    {
      title: 'Avg Model Accuracy',
      value: `${Math.round(Object.values(models).reduce((sum, m) => sum + m.accuracy, 0) / Object.keys(models).length * 100)}%`,
      icon: Target,
      color: 'bg-green-500'
    },
    {
      title: 'High-Risk Patients',
      value: predictions.risks.filter(r => r.overallRisk === 'high' || r.overallRisk === 'critical').length,
      icon: AlertTriangle,
      color: 'bg-red-500'
    },
    {
      title: 'Revenue Forecast',
      value: predictions.revenue ? `$${Math.round(predictions.revenue.predictedRevenue).toLocaleString()}` : 'Loading...',
      icon: DollarSign,
      color: 'bg-yellow-500'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'outcomes', label: 'Patient Outcomes', icon: Activity },
    { id: 'noshow', label: 'No-Show Prediction', icon: Calendar },
    { id: 'revenue', label: 'Revenue Forecast', icon: DollarSign },
    { id: 'risk', label: 'Risk Assessment', icon: Shield },
    { id: 'effectiveness', label: 'Treatment Analysis', icon: Zap }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading predictive analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="text-blue-500" size={28} />
            Predictive Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered insights for better clinical decisions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Settings size={16} className="mr-2" />
            Configure Models
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stat.value}
                        {stat.total && <span className="text-sm text-gray-500">/{stat.total}</span>}
                      </p>
                    </div>
                    <div className={`p-3 ${stat.color} rounded-lg`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Model Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Model Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelOverview.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        model.status === 'active' ? 'bg-green-100 dark:bg-green-900/20' :
                        model.status === 'training' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        'bg-red-100 dark:bg-red-900/20'
                      }`}>
                        <Brain size={16} className={
                          model.status === 'active' ? 'text-green-600' :
                          model.status === 'training' ? 'text-yellow-600' :
                          'text-red-600'
                        } />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {model.type} • Accuracy: {Math.round(model.accuracy * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={
                        model.status === 'active' ? 'default' :
                        model.status === 'training' ? 'secondary' :
                        'destructive'
                      }>
                        {model.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        <Clock size={14} className="inline mr-1" />
                        {new Date(model.lastTrained).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModelRetrain(model.id)}
                        disabled={model.status === 'training'}
                      >
                        {model.status === 'training' ? 'Training...' : 'Retrain'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Forecast Tab */}
      {activeTab === 'revenue' && predictions.revenue && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign size={20} />
                Revenue Forecast - {predictions.revenue.period}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    ${Math.round(predictions.revenue.predictedRevenue).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    Confidence: {Math.round(predictions.revenue.confidence * 100)}%
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Revenue Breakdown</h4>
                    {predictions.revenue.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{item.service}</span>
                        <div className="text-right">
                          <div className="font-medium">${Math.round(item.predictedRevenue).toLocaleString()}</div>
                          <div className="text-sm text-green-600">+{Math.round(item.growth * 100)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Trends</h4>
                  <div className="space-y-3">
                    {predictions.revenue.trends.map((trend, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">{trend.factor}</span>
                          <span className="text-sm font-medium text-blue-600">
                            {Math.round(trend.impact * 100)}% impact
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{trend.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other tabs would be implemented similarly */}
      {activeTab !== 'overview' && activeTab !== 'revenue' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <Activity size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p>This section is under development and will be available in the next update.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PredictiveAnalyticsDashboard;
