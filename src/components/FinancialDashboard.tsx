import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Activity, AlertTriangle, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";

interface Article {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  keywords: string[];
  sentiment: number;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface FinancialData {
  timestamp: string;
  articles: Article[];
  summary: {
    total_articles: number;
    sentiment_average: number;
    top_keywords: string[];
  };
}

interface AnalysisReport {
  timestamp?: string;
  market_indicators: {
    overall_sentiment: number;
    volatility_index: number;
    news_volume: number;
    key_themes: { keyword: string; mentions: number }[];
    risk_signals: { signal: string; frequency: number; severity: string }[];
    opportunity_signals: { signal: string; frequency: number; strength: string }[];
  };
  hot_topics: {
    hot_topics: {
      keyword: string;
      mentions: number;
      hotness_score: number;
      avg_sentiment: number;
    }[];
  };
}

const fetchFinancialData = async (): Promise<FinancialData> => {
  const response = await fetch('/data/financial/daily-articles.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch financial data');
  }

  const payload = (await response.json()) as FinancialData;
  if (payload.timestamp) {
    return payload;
  }

  const lastModified = response.headers.get('last-modified');
  return {
    ...payload,
    timestamp: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString(),
  };
};

const fetchAnalysisReport = async (): Promise<AnalysisReport> => {
  const response = await fetch('/data/financial/analysis-report.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch analysis report');
  }

  const payload = (await response.json()) as AnalysisReport;
  if (payload.timestamp) {
    return payload;
  }

  const lastModified = response.headers.get('last-modified');
  return {
    ...payload,
    timestamp: lastModified ? new Date(lastModified).toISOString() : undefined,
  };
};

const staleThresholdMs = 1000 * 60 * 60 * 6; // 6 hours

const SentimentIndicator = ({ sentiment }: { sentiment: number }) => {
  const getSentimentColor = (value: number) => {
    if (value > 0.1) return "text-green-600";
    if (value < -0.1) return "text-red-600";
    return "text-gray-600";
  };

  const getSentimentIcon = (value: number) => {
    if (value > 0.1) return <TrendingUp className="h-4 w-4" />;
    if (value < -0.1) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <div className={`flex items-center gap-1 ${getSentimentColor(sentiment)}`}>
      {getSentimentIcon(sentiment)}
      <span className="text-sm font-medium">
        {sentiment > 0 ? '+' : ''}{sentiment.toFixed(3)}
      </span>
    </div>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const getVariant = (p: string) => {
    switch (p) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return <Badge variant={getVariant(priority)}>{priority}</Badge>;
};

export const FinancialDashboard = () => {
  const { data: financialData, isLoading: loadingData } = useQuery({
    queryKey: ['financial-data'],
    queryFn: fetchFinancialData,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: analysisReport, isLoading: loadingAnalysis } = useQuery({
    queryKey: ['analysis-report'],
    queryFn: fetchAnalysisReport,
    refetchInterval: 300000,
  });

  if (loadingData || loadingAnalysis) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    );
  }

  if (!financialData || !analysisReport) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
          <p className="text-sm text-muted-foreground">Failed to load financial data</p>
        </div>
      </Card>
    );
  }

  const marketIndicators = analysisReport.market_indicators;
  const hotTopics = analysisReport.hot_topics.hot_topics;

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentIndicator sentiment={marketIndicators.overall_sentiment} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">News Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketIndicators.news_volume}</div>
            <p className="text-xs text-muted-foreground">articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Volatility Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketIndicators.volatility_index.toFixed(3)}</div>
            <p className="text-xs text-muted-foreground">sentiment variance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(financialData.timestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hot Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Hot Topics
            </CardTitle>
            <CardDescription>
              Trending keywords and emerging themes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hotTopics.slice(0, 5).map((topic, index) => (
                <div key={topic.keyword} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span>{topic.keyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{topic.mentions} mentions</Badge>
                    <SentimentIndicator sentiment={topic.avg_sentiment} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Themes */}
        <Card>
          <CardHeader>
            <CardTitle>Key Market Themes</CardTitle>
            <CardDescription>
              Most mentioned topics in recent articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketIndicators.key_themes.map((theme, index) => (
                <div key={theme.keyword} className="flex items-center justify-between">
                  <span className="font-medium">{theme.keyword}</span>
                  <Badge variant="secondary">{theme.mentions}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Risk Signals
            </CardTitle>
            <CardDescription>
              Potential market concerns and warnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketIndicators.risk_signals.length > 0 ? (
              <div className="space-y-2">
                {marketIndicators.risk_signals.map((signal, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{signal.signal}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{signal.frequency}</Badge>
                      <Badge variant={signal.severity === 'high' ? 'destructive' : 'default'}>
                        {signal.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No significant risk signals detected</p>
            )}
          </CardContent>
        </Card>

        {/* Opportunity Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Opportunity Signals
            </CardTitle>
            <CardDescription>
              Positive market indicators and opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketIndicators.opportunity_signals.length > 0 ? (
              <div className="space-y-2">
                {marketIndicators.opportunity_signals.map((signal, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{signal.signal}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{signal.frequency}</Badge>
                      <Badge variant={signal.strength === 'high' ? 'default' : 'secondary'}>
                        {signal.strength}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No significant opportunity signals detected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Articles</CardTitle>
          <CardDescription>
            Latest financial news and analysis from monitored sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialData.articles.slice(0, 10).map((article) => (
              <div key={article.id} className="border-l-4 border-l-blue-500 pl-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{article.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{new Date(article.date).toLocaleDateString()}</span>
                    </div>
                    {article.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <PriorityBadge priority={article.priority} />
                    <SentimentIndicator sentiment={article.sentiment} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
