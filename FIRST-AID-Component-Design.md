# FIRST-AID Component Design Specification

## Overview
Detailed component design for the FIRST-AID intelligent audit findings management system, covering UI components, system modules, and integration patterns across desktop, web, and mobile platforms.

---

## Component Architecture Principles

### 🎯 **Design Philosophy**
- **Consistency**: Unified design language across all platforms
- **Accessibility**: WCAG 2.1 AA compliance for inclusive access
- **Responsiveness**: Adaptive layouts for all screen sizes
- **Performance**: Optimized rendering and data loading
- **Privacy-First**: UI components respect data protection requirements

### 🔧 **Technical Principles**
- **Component Reusability**: Shared components across platforms
- **State Management**: Centralized state with local component state
- **Type Safety**: Full TypeScript coverage
- **Testing**: Unit tests for all components
- **Documentation**: Comprehensive component documentation

---

## Platform-Specific Components

### Desktop Application (Qt/C++)

#### **Main Window Components**

##### **MainWindow**
Primary application window with navigation and content areas.

```cpp
class MainWindow : public QMainWindow {
    Q_OBJECT

private:
    // Core UI components
    NavigationBar* m_navigationBar;
    ContentStackWidget* m_contentStack;
    StatusBar* m_statusBar;
    SettingsDialog* m_settingsDialog;
    
    // Service connections
    FirebaseConnector* m_firebase;
    AuthManager* m_authManager;
    NotificationManager* m_notifications;

public:
    explicit MainWindow(QWidget* parent = nullptr);
    ~MainWindow();
    
    void showDashboard();
    void showFindings();
    void showChat();
    void showReports();
    void showSettings();

private slots:
    void onNavigationChanged(const QString& section);
    void onUserAuthenticated(const User& user);
    void onDataRefreshNeeded();
    void onNotificationReceived(const Notification& notification);

signals:
    void navigationRequested(const QString& section);
    void userLoggedOut();
};
```

##### **NavigationBar**
Primary navigation component with role-based menu items.

```cpp
class NavigationBar : public QWidget {
    Q_OBJECT

private:
    struct NavigationItem {
        QString id;
        QString title;
        QIcon icon;
        QString tooltip;
        bool isEnabled;
        int badgeCount;
    };
    
    QVBoxLayout* m_layout;
    QButtonGroup* m_buttonGroup;
    QLabel* m_userProfile;
    QList<NavigationItem> m_items;

public:
    explicit NavigationBar(QWidget* parent = nullptr);
    
    void setActiveItem(const QString& itemId);
    void setBadgeCount(const QString& itemId, int count);
    void setUserProfile(const User& user);
    void updatePermissions(const QStringList& allowedSections);

private slots:
    void onItemClicked(int buttonId);
    void onUserProfileClicked();

signals:
    void itemSelected(const QString& itemId);
    void userProfileRequested();
    void settingsRequested();
    void logoutRequested();
};
```

#### **Dashboard Components**

##### **DashboardWidget**
Main dashboard with statistics and quick actions.

```cpp
class DashboardWidget : public QWidget {
    Q_OBJECT

private:
    // Statistics widgets
    StatisticsCardWidget* m_totalFindings;
    StatisticsCardWidget* m_openFindings;
    StatisticsCardWidget* m_highRiskFindings;
    StatisticsCardWidget* m_overdueFindings;
    
    // Charts and visualizations
    FindingsTrendChart* m_trendChart;
    SeverityDistributionChart* m_severityChart;
    LocationSummaryChart* m_locationChart;
    
    // Recent activity
    RecentActivityWidget* m_recentActivity;
    QuickActionsWidget* m_quickActions;
    
    // Data management
    DashboardDataManager* m_dataManager;
    QTimer* m_refreshTimer;

public:
    explicit DashboardWidget(QWidget* parent = nullptr);
    
    void refreshData();
    void updateStatistics(const DashboardStats& stats);
    void setLoadingState(bool isLoading);

private slots:
    void onRefreshRequested();
    void onQuickActionTriggered(const QString& action);
    void onChartInteraction(const ChartInteraction& interaction);

signals:
    void navigationRequested(const QString& destination);
    void actionRequested(const QString& action, const QVariant& data);
};
```

##### **StatisticsCardWidget**
Reusable statistics display component.

```cpp
class StatisticsCardWidget : public QWidget {
    Q_OBJECT

private:
    QString m_title;
    QString m_value;
    QString m_subtitle;
    QColor m_accentColor;
    TrendIndicator m_trend;
    
    QLabel* m_titleLabel;
    QLabel* m_valueLabel;
    QLabel* m_subtitleLabel;
    QLabel* m_trendIcon;

public:
    enum TrendIndicator { None, Up, Down, Stable };
    
    explicit StatisticsCardWidget(const QString& title, QWidget* parent = nullptr);
    
    void setValue(const QString& value);
    void setSubtitle(const QString& subtitle);
    void setTrend(TrendIndicator trend, const QString& trendText = "");
    void setAccentColor(const QColor& color);
    void setClickable(bool clickable);

protected:
    void paintEvent(QPaintEvent* event) override;
    void mousePressEvent(QMouseEvent* event) override;
    void enterEvent(QEnterEvent* event) override;
    void leaveEvent(QEvent* event) override;

signals:
    void clicked();
};
```

#### **Findings Management Components**

##### **FindingsTableWidget**
Advanced table for displaying and managing audit findings.

```cpp
class FindingsTableWidget : public QWidget {
    Q_OBJECT

private:
    QTableView* m_tableView;
    FindingsTableModel* m_model;
    FindingsProxyModel* m_proxyModel;
    
    // Toolbar and controls
    QToolBar* m_toolbar;
    QLineEdit* m_searchBox;
    QComboBox* m_severityFilter;
    QComboBox* m_statusFilter;
    QComboBox* m_locationFilter;
    
    // Context menu
    QMenu* m_contextMenu;
    QAction* m_editAction;
    QAction* m_deleteAction;
    QAction* m_exportAction;

public:
    explicit FindingsTableWidget(QWidget* parent = nullptr);
    
    void loadFindings(const QList<Finding>& findings);
    void refreshData();
    void applyFilters(const FindingFilters& filters);
    void selectFinding(const QString& findingId);
    
    QList<Finding> selectedFindings() const;
    FindingFilters currentFilters() const;

private slots:
    void onSelectionChanged();
    void onFilterChanged();
    void onSearchTextChanged(const QString& text);
    void onContextMenuRequested(const QPoint& pos);
    void onRowDoubleClicked(const QModelIndex& index);

signals:
    void findingSelected(const Finding& finding);
    void findingsSelected(const QList<Finding>& findings);
    void editRequested(const Finding& finding);
    void deleteRequested(const QList<Finding>& findings);
    void exportRequested(const QList<Finding>& findings);
    void filtersChanged(const FindingFilters& filters);
};
```

##### **FindingEditDialog**
Modal dialog for creating/editing audit findings.

```cpp
class FindingEditDialog : public QDialog {
    Q_OBJECT

private:
    // Form widgets
    QLineEdit* m_titleEdit;
    QTextEdit* m_descriptionEdit;
    QComboBox* m_severityCombo;
    QComboBox* m_statusCombo;
    QComboBox* m_categoryCombo;
    QLineEdit* m_locationEdit;
    QLineEdit* m_responsiblePersonEdit;
    QDateEdit* m_dateIdentifiedEdit;
    QDateEdit* m_dateDueEdit;
    QTextEdit* m_recommendationEdit;
    QTextEdit* m_managementResponseEdit;
    QListWidget* m_tagsWidget;
    QSlider* m_riskLevelSlider;
    
    // Data
    Finding m_finding;
    bool m_isNewFinding;
    
    // Validation
    QLabel* m_validationLabel;
    bool m_isValid;

public:
    explicit FindingEditDialog(QWidget* parent = nullptr);
    explicit FindingEditDialog(const Finding& finding, QWidget* parent = nullptr);
    
    Finding getFinding() const;
    bool validateForm();

private slots:
    void onDataChanged();
    void onAddTagClicked();
    void onRemoveTagClicked();
    void onSaveClicked();
    void onCancelClicked();

private:
    void setupUI();
    void populateForm();
    void validateInput();
    void showValidationError(const QString& message);

signals:
    void findingSaved(const Finding& finding);
};
```

#### **AI Chat Components**

##### **ChatWidget**
AI-powered chat interface for audit insights.

```cpp
class ChatWidget : public QWidget {
    Q_OBJECT

private:
    // UI components
    ChatMessagesWidget* m_messagesWidget;
    ChatInputWidget* m_inputWidget;
    ChatSuggestionsWidget* m_suggestionsWidget;
    QSplitter* m_splitter;
    
    // Session management
    ChatSession m_currentSession;
    QList<ChatSession> m_sessions;
    ChatSessionManager* m_sessionManager;
    
    // AI service
    AIService* m_aiService;
    QTimer* m_typingTimer;

public:
    explicit ChatWidget(QWidget* parent = nullptr);
    
    void startNewSession();
    void loadSession(const QString& sessionId);
    void sendMessage(const QString& message);
    void clearChat();

private slots:
    void onMessageSent(const QString& message);
    void onResponseReceived(const ChatResponse& response);
    void onSuggestionClicked(const QString& suggestion);
    void onSessionChanged(const QString& sessionId);
    void onTypingTimeout();

signals:
    void messageProcessed(const ChatMessage& message);
    void sessionCreated(const ChatSession& session);
    void navigationRequested(const QString& destination, const QVariant& data);
};
```

##### **ChatMessagesWidget**
Scrollable chat messages display.

```cpp
class ChatMessagesWidget : public QScrollArea {
    Q_OBJECT

private:
    QWidget* m_contentWidget;
    QVBoxLayout* m_layout;
    QList<ChatMessageWidget*> m_messageWidgets;
    
    // Auto-scroll behavior
    bool m_autoScroll;
    int m_lastScrollPosition;

public:
    explicit ChatMessagesWidget(QWidget* parent = nullptr);
    
    void addMessage(const ChatMessage& message);
    void addTypingIndicator();
    void removeTypingIndicator();
    void clearMessages();
    void scrollToBottom();

private slots:
    void onScrollChanged(int value);
    void onMessageClicked(const ChatMessage& message);

signals:
    void messageClicked(const ChatMessage& message);
    void sourceClicked(const QString& findingId);
};
```

### Web Application (React/TypeScript)

#### **Core Application Components**

##### **App Component**
Root application component with routing and state management.

```typescript
interface AppState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  theme: 'light' | 'dark'
  notifications: Notification[]
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    theme: 'light',
    notifications: []
  })

  const authService = useAuthService()
  const notificationService = useNotificationService()
  
  useEffect(() => {
    authService.checkAuthState()
      .then(user => {
        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: !!user,
          isLoading: false
        }))
      })
      .catch(error => {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false
        }))
      })
  }, [])

  if (state.isLoading) {
    return <LoadingSpinner />
  }

  return (
    <BrowserRouter>
      <ThemeProvider theme={state.theme}>
        <NotificationProvider>
          <AuthGuard isAuthenticated={state.isAuthenticated}>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/findings" element={<FindingsPage />} />
                <Route path="/findings/:id" element={<FindingDetailsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </AppLayout>
          </AuthGuard>
        </NotificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
```

##### **AppLayout Component**
Main application layout with navigation and content areas.

```typescript
interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentPath={pathname}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header 
          user={user}
          notifications={notifications}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
```

#### **Dashboard Components**

##### **Dashboard Component**
Main dashboard with statistics and visualizations.

```typescript
interface DashboardStats {
  totalFindings: number
  openFindings: number
  highRiskFindings: number
  overdueFindings: number
  trends: {
    newThisMonth: number
    closedThisMonth: number
    changePercentage: number
  }
  riskDistribution: Record<string, number>
  locationSummary: Array<{
    location: string
    total: number
    open: number
  }>
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { data: dashboardData, isLoading, error: fetchError } = useDashboardStats()

  useEffect(() => {
    if (dashboardData) {
      setStats(dashboardData)
      setLoading(false)
    }
    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
    }
  }, [dashboardData, fetchError])

  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorMessage message={error} />
  if (!stats) return <EmptyState message="No data available" />

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatisticsCard
          title="Total Findings"
          value={stats.totalFindings}
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatisticsCard
          title="Open Findings"
          value={stats.openFindings}
          icon={ExclamationTriangleIcon}
          color="yellow"
          trend={{
            value: stats.trends.changePercentage,
            direction: stats.trends.changePercentage > 0 ? 'up' : 'down'
          }}
        />
        <StatisticsCard
          title="High Risk"
          value={stats.highRiskFindings}
          icon={ShieldExclamationIcon}
          color="red"
        />
        <StatisticsCard
          title="Overdue"
          value={stats.overdueFindings}
          icon={ClockIcon}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={stats.riskDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={stats.locationSummary} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityList />
        </CardContent>
      </Card>
    </div>
  )
}
```

##### **StatisticsCard Component**
Reusable statistics display card.

```typescript
interface StatisticsCardProps {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'yellow' | 'red' | 'orange'
  trend?: {
    value: number
    direction: 'up' | 'down' | 'stable'
  }
  subtitle?: string
  onClick?: () => void
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  onClick
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-100',
    green: 'bg-green-500 text-green-100',
    yellow: 'bg-yellow-500 text-yellow-100',
    red: 'bg-red-500 text-red-100',
    orange: 'bg-orange-500 text-orange-100'
  }

  const trendIcon = trend?.direction === 'up' 
    ? ArrowTrendingUpIcon
    : trend?.direction === 'down'
    ? ArrowTrendingDownIcon
    : null

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg",
        onClick && "cursor-pointer hover:scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                {trendIcon && (
                  <trendIcon className={cn(
                    "w-4 h-4 mr-1",
                    trend.direction === 'up' ? "text-green-500" : "text-red-500"
                  )} />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  trend.direction === 'up' ? "text-green-600" : "text-red-600"
                )}>
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### **Findings Management Components**

##### **FindingsTable Component**
Advanced data table for audit findings management.

```typescript
interface FindingsTableProps {
  findings: Finding[]
  loading?: boolean
  onEdit?: (finding: Finding) => void
  onDelete?: (findings: Finding[]) => void
  onExport?: (findings: Finding[]) => void
  onSelectionChange?: (findings: Finding[]) => void
}

const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  loading = false,
  onEdit,
  onDelete,
  onExport,
  onSelectionChange
}) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Finding
    direction: 'asc' | 'desc'
  } | null>(null)

  const columns: ColumnDef<Finding>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => (
        <SeverityBadge severity={row.original.severity} />
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.title}>
          {row.original.title}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'responsiblePerson',
      header: 'Responsible',
    },
    {
      accessorKey: 'dateIdentified',
      header: 'Date',
      cell: ({ row }) => (
        <span>{formatDate(row.original.dateIdentified)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.([row.original])}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: findings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setSelectedRows,
    state: {
      rowSelection: selectedRows,
      sorting: sortConfig ? [sortConfig] : [],
    },
  })

  return (
    <div className="space-y-4">
      {/* Table Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {selectedRows.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.(findings.filter(f => selectedRows.includes(f.id)))}
              >
                Export Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete?.(findings.filter(f => selectedRows.includes(f.id)))}
              >
                Delete Selected
              </Button>
            </>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {selectedRows.length} of {findings.length} row(s) selected
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

#### **AI Chat Components**

##### **ChatInterface Component**
AI-powered chat interface for audit insights.

```typescript
interface ChatInterfaceProps {
  sessionId?: string
  onNavigate?: (destination: string, data?: any) => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const { sendMessage, isLoading } = useChatService()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    try {
      const response = await sendMessage(message, sessionId)
      
      const assistantMessage: ChatMessage = {
        id: response.messageId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          confidence: response.confidence,
          sources: response.sources,
          suggestions: response.followUpSuggestions
        }
      }

      setMessages(prev => [...prev, assistantMessage])
      setSuggestions(response.followUpSuggestions || [])
    } catch (error) {
      console.error('Chat error:', error)
      // Handle error
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p>Ask me anything about your audit findings. I can help you analyze patterns, find insights, and answer questions.</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSourceClick={(findingId) => onNavigate?.('findings', { id: findingId })}
            />
          ))
        )}
        
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="text-sm bg-white border rounded-full px-3 py-1 hover:bg-gray-100"
                onClick={() => handleSendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Ask about your audit findings..."
        />
      </div>
    </div>
  )
}
```

### Mobile Application (React Native)

#### **Core Navigation Components**

##### **App Navigator**
Main navigation structure for mobile app.

```typescript
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline'
              break
            case 'Findings':
              iconName = focused ? 'document-text' : 'document-text-outline'
              break
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'
              break
            case 'Reports':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline'
              break
            default:
              iconName = 'circle'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Findings" component={FindingsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
    </Tab.Navigator>
  )
}

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="FindingDetails" 
          component={FindingDetailsScreen}
          options={{ title: 'Finding Details' }}
        />
        <Stack.Screen 
          name="FindingEdit" 
          component={FindingEditScreen}
          options={{ title: 'Edit Finding' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

#### **Dashboard Components**

##### **DashboardScreen**
Mobile dashboard with optimized layout.

```typescript
import { RefreshControl, ScrollView, View } from 'react-native'

interface DashboardScreenProps {
  navigation: any
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false)
  const { data: stats, isLoading, refetch } = useDashboardStats()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleCardPress = (destination: string, params?: any) => {
    navigation.navigate(destination, params)
  }

  if (isLoading && !stats) {
    return <DashboardSkeleton />
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Findings"
            value={stats?.totalFindings || 0}
            color="#3B82F6"
            icon="document-text"
            onPress={() => handleCardPress('Findings')}
          />
          <StatCard
            title="Open"
            value={stats?.openFindings || 0}
            color="#F59E0B"
            icon="exclamation-triangle"
            onPress={() => handleCardPress('Findings', { filter: { status: 'Open' } })}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="High Risk"
            value={stats?.highRiskFindings || 0}
            color="#EF4444"
            icon="shield-exclamation"
            onPress={() => handleCardPress('Findings', { filter: { severity: 'High' } })}
          />
          <StatCard
            title="Overdue"
            value={stats?.overdueFindings || 0}
            color="#F97316"
            icon="clock"
            onPress={() => handleCardPress('Findings', { filter: { overdue: true } })}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionButton
            title="New Finding"
            icon="add-circle"
            color="#10B981"
            onPress={() => navigation.navigate('FindingEdit')}
          />
          <ActionButton
            title="AI Chat"
            icon="chatbubbles"
            color="#8B5CF6"
            onPress={() => navigation.navigate('Chat')}
          />
          <ActionButton
            title="Generate Report"
            icon="document"
            color="#6366F1"
            onPress={() => navigation.navigate('Reports')}
          />
          <ActionButton
            title="Search"
            icon="search"
            color="#06B6D4"
            onPress={() => navigation.navigate('Findings', { focusSearch: true })}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <RecentActivityList
          onItemPress={(item) => navigation.navigate('FindingDetails', { id: item.findingId })}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recentActivity: {
    padding: 16,
  },
})
```

---

## Shared Components Library

### **Common UI Components**

#### **Loading States**
```typescript
// Skeleton loaders for different content types
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
)

const FindingsTableSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex space-x-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    ))}
  </div>
)
```

#### **Form Components**
```typescript
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

const FormField: React.FC<FormFieldProps> = ({ label, error, required, children }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
)

interface SelectFieldProps {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const SelectField: React.FC<SelectFieldProps> = ({ options, value, onChange, placeholder }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)
```

#### **Status & Severity Components**
```typescript
interface SeverityBadgeProps {
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  size?: 'sm' | 'md' | 'lg'
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const config = {
    Critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: '🔴' },
    High: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🟠' },
    Medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🟡' },
    Low: { color: 'bg-green-100 text-green-800 border-green-200', icon: '🟢' },
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <span className={cn(
      'inline-flex items-center border rounded-full font-medium',
      config[severity].color,
      sizeClasses[size]
    )}>
      <span className="mr-1">{config[severity].icon}</span>
      {severity}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'Open' | 'In Progress' | 'Closed' | 'Deferred'
  size?: 'sm' | 'md' | 'lg'
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = {
    'Open': { color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'In Progress': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    'Closed': { color: 'bg-green-100 text-green-800 border-green-200' },
    'Deferred': { color: 'bg-gray-100 text-gray-800 border-gray-200' },
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <span className={cn(
      'inline-flex items-center border rounded-full font-medium',
      config[status].color,
      sizeClasses[size]
    )}>
      {status}
    </span>
  )
}
```

---

## Component Integration Patterns

### **State Management**
- **Global State**: Redux Toolkit for app-wide state
- **Server State**: React Query for API data
- **Local State**: useState/useReducer for component state
- **Form State**: React Hook Form for complex forms

### **Error Handling**
- **Error Boundaries**: Catch and handle React errors
- **API Errors**: Centralized error handling with user-friendly messages
- **Form Validation**: Real-time validation with clear error messages
- **Network Errors**: Offline handling and retry mechanisms

### **Performance Optimization**
- **Code Splitting**: Lazy loading for route-based components
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtualization**: Virtual scrolling for large data sets
- **Image Optimization**: Lazy loading and responsive images

### **Accessibility Features**
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Readers**: ARIA labels and semantic HTML
- **High Contrast**: Support for high contrast themes
- **Focus Management**: Proper focus handling for modals and navigation

This component design provides a comprehensive foundation for building consistent, accessible, and performant user interfaces across all FIRST-AID platforms while maintaining code reusability and development efficiency.