'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Database,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AdminPasswordModal from '@/components/admin/AdminPasswordModal';

interface TableInfo {
  name: string;
  category: string;
  description: string;
  rowCount: number;
}

interface School {
  school_code: string;
  school_name: string;
}

export default function AdminTablesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSchool !== 'all') {
        params.append('school_code', selectedSchool);
      }
      const response = await fetch(`/api/admin/tables?${params.toString()}`);
      const result = await response.json();
      if (result.tables) {
        setTables(result.tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/admin/schools-list');
      const result = await response.json();
      if (result.schools) {
        setSchools(result.schools);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchTableData = useCallback(async () => {
    if (!selectedTable) return;
    try {
      setDataLoading(true);
      const params = new URLSearchParams();
      if (selectedSchool !== 'all') {
        params.append('school_code', selectedSchool);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      params.append('page', page.toString());
      params.append('limit', '50');

      const response = await fetch(`/api/admin/tables/${selectedTable}?${params.toString()}`);
      const result = await response.json();
      if (result.data) {
        setTableData(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.count || 0);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [selectedTable, selectedSchool, searchTerm, page]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTables();
      fetchSchools();
    }
  }, [isAuthenticated, selectedSchool, fetchTables]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, selectedSchool, searchTerm, page, fetchTableData]);

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
    table.category.toLowerCase().includes(tableSearch.toLowerCase()) ||
    table.description.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const groupedTables = filteredTables.reduce((acc, table) => {
    if (!acc[table.category]) {
      acc[table.category] = [];
    }
    acc[table.category].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return String(value);
  };

  const getTableHeaders = (): string[] => {
    if (tableData.length === 0) return [];
    return Object.keys(tableData[0]);
  };

  if (!isAuthenticated) {
    return (
      <AdminPasswordModal
        isOpen={!isAuthenticated}
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="glass-card border-b border-white/20 dark:border-white/10 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft size={20} className="text-foreground" />
              </Link>
              <Database size={24} className="text-primary" />
              <h1 className="text-xl font-bold text-foreground">Database Tables</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchTables();
                  if (selectedTable) fetchTableData();
                }}
                title="Refresh"
              >
                <RefreshCw size={18} className="mr-2" />
                Refresh
              </Button>
              <Link
                href="/admin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedTable ? (
          <>
            {/* Filters */}
            <div className="glass-card soft-shadow rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search tables by name, category, or description..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative min-w-[200px]">
                  <Filter size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-accent/30"
                  >
                    <option value="all">All Schools</option>
                    {schools.map((school) => (
                      <option key={school.school_code} value={school.school_code}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tables List */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading tables...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTables).map(([category, categoryTables]) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card soft-shadow rounded-xl p-6"
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                      <FileText size={20} className="mr-2 text-primary" />
                      {category}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryTables.map((table) => (
                        <motion.button
                          key={table.name}
                          onClick={() => {
                            setSelectedTable(table.name);
                            setPage(1);
                            setSearchTerm('');
                          }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="glass-card soft-shadow rounded-lg p-4 text-left hover:shadow-lg transition-all border border-white/20 dark:border-white/10"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-foreground text-sm truncate flex-1">{table.name}</h3>
                            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                              {table.rowCount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{table.description}</p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Table Data Viewer */}
            <div className="glass-card soft-shadow rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTable(null);
                      setTableData([]);
                      setPage(1);
                    }}
                  >
                    <ChevronLeft size={18} className="mr-2" />
                    Back to Tables
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedTable}</h2>
                    <p className="text-sm text-muted-foreground">
                      {totalCount.toLocaleString()} total rows
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters for Table Data */}
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search in table data..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedSchool}
                  onChange={(e) => {
                    setSelectedSchool(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-card border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-accent/30 min-w-[200px]"
                >
                  <option value="all">All Schools</option>
                  {schools.map((school) => (
                    <option key={school.school_code} value={school.school_code}>
                      {school.school_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table Data Display */}
              {dataLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading data...</div>
              ) : tableData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No data found</div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-input">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          {getTableHeaders().map((header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-input">
                        {tableData.map((row, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            {getTableHeaders().map((header) => (
                              <td
                                key={header}
                                className="px-4 py-3 text-sm text-foreground max-w-xs truncate"
                                title={formatValue(row[header])}
                              >
                                {formatValue(row[header])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing page {page} of {totalPages} ({totalCount.toLocaleString()} total rows)
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft size={18} />
                        </Button>
                        <span className="text-sm text-foreground px-2">
                          {page} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          <ChevronRight size={18} />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
