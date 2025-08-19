import React, { useState, useEffect, useMemo } from 'react';
import { Upload, TrendingUp, TrendingDown, Users, Car, DollarSign, Star, XCircle, AlertCircle, MapPin, Calendar, Clock, CreditCard, Filter, BarChart3, PieChart, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import Papa from 'papaparse';

const RideAnalyticsDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState('overview');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (result) => {
          // Clean headers by trimming whitespace
          const headers = result.meta.fields.map(h => h.trim());
          
          const cleanedData = result.data.map(row => {
            const cleanRow = {};
            
            // Map trimmed headers to values
            headers.forEach((header, index) => {
              const originalHeader = result.meta.fields[index];
              let value = row[originalHeader];
              
              // Remove escaped quotes if present
              if (typeof value === 'string') {
                value = value.replace(/^["']|["']$/g, '').replace(/\\"/g, '"');
              }
              
              // Handle string fields
              if (['Date', 'Time', 'Booking ID', 'Booking Status', 'Customer ID', 
                   'Vehicle Type', 'Pickup Location', 'Drop Location', 
                   'Reason for cancelling by Customer', 'Driver Cancellation Reason', 
                   'Incomplete Rides Reason', 'Payment Method'].includes(header)) {
                cleanRow[header] = value && value !== 'null' && value !== 'NaN' ? String(value).trim() : '';
              }
              // Handle numeric fields
              else if (['Avg VTAT', 'Avg CTAT', 'Cancelled Rides by Customer', 
                        'Cancelled Rides by Driver', 'Incomplete Rides', 
                        'Booking Value', 'Ride Distance', 'Driver Ratings', 
                        'Customer Rating'].includes(header)) {
                // Check if value is 'null' string or actual null
                if (value === 'null' || value === null || value === undefined || value === '') {
                  cleanRow[header] = 0;
                } else {
                  const numValue = parseFloat(value);
                  cleanRow[header] = !isNaN(numValue) && isFinite(numValue) ? numValue : 0;
                }
              }
              else {
                cleanRow[header] = value;
              }
            });
            
            return cleanRow;
          }).filter(row => row['Booking ID']); // Filter out completely empty rows
          
          setData(cleanedData);
          setLoading(false);
        }
      });
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const vehicleMatch = selectedVehicleType === 'all' || row['Vehicle Type'] === selectedVehicleType;
      const paymentMatch = selectedPaymentMethod === 'all' || row['Payment Method'] === selectedPaymentMethod;
      const dateMatch = (!dateRange.start || row.Date >= dateRange.start) && 
                       (!dateRange.end || row.Date <= dateRange.end);
      return vehicleMatch && paymentMatch && dateMatch;
    });
  }, [data, selectedVehicleType, selectedPaymentMethod, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (filteredData.length === 0) return {};
    
    const totalBookings = filteredData.length;
    
    // Check for "Completed" status (based on actual data)
    const completedRides = filteredData.filter(r => {
      const status = r['Booking Status'];
      return status && status.toLowerCase() === 'completed';
    }).length;
    
    // Count cancellations - these are both from status and from the numeric fields
    let cancelledByCustomerCount = filteredData.filter(r => 
      r['Booking Status'] && r['Booking Status'].toLowerCase() === 'cancelled by customer'
    ).length;
    
    let cancelledByDriverCount = filteredData.filter(r => 
      r['Booking Status'] && r['Booking Status'].toLowerCase() === 'cancelled by driver'
    ).length;
    
    // Also add numeric cancellation fields if they exist
    const cancelledByCustomerNumeric = filteredData.reduce((sum, r) => {
      const val = r['Cancelled Rides by Customer'];
      return sum + (typeof val === 'number' && !isNaN(val) && val > 0 ? val : 0);
    }, 0);
    
    const cancelledByDriverNumeric = filteredData.reduce((sum, r) => {
      const val = r['Cancelled Rides by Driver'];
      return sum + (typeof val === 'number' && !isNaN(val) && val > 0 ? val : 0);
    }, 0);
    
    // Use the maximum of status-based count or numeric count
    const cancelledByCustomer = Math.max(cancelledByCustomerCount, cancelledByCustomerNumeric);
    const cancelledByDriver = Math.max(cancelledByDriverCount, cancelledByDriverNumeric);
    
    // Count incomplete rides
    let incompleteCount = filteredData.filter(r => 
      r['Booking Status'] && r['Booking Status'].toLowerCase() === 'incomplete'
    ).length;
    
    const incompleteNumeric = filteredData.reduce((sum, r) => {
      const val = r['Incomplete Rides'];
      return sum + (typeof val === 'number' && !isNaN(val) && val > 0 ? val : 0);
    }, 0);
    
    const incompleteRides = Math.max(incompleteCount, incompleteNumeric);
    
    // Count "No Driver Found" status
    const noDriverFound = filteredData.filter(r => 
      r['Booking Status'] && r['Booking Status'].toLowerCase() === 'no driver found'
    ).length;
    
    const totalRevenue = filteredData.reduce((sum, r) => {
      const val = r['Booking Value'];
      // Only count revenue for completed rides
      if (r['Booking Status'] && r['Booking Status'].toLowerCase() === 'completed') {
        return sum + (typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0);
      }
      return sum;
    }, 0);
    
    const totalDistance = filteredData.reduce((sum, r) => {
      const val = r['Ride Distance'];
      // Only count distance for completed rides
      if (r['Booking Status'] && r['Booking Status'].toLowerCase() === 'completed') {
        return sum + (typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0);
      }
      return sum;
    }, 0);
    
    const completedRidesWithRatings = filteredData.filter(r => 
      r['Booking Status'] && r['Booking Status'].toLowerCase() === 'completed'
    );
    
    const validDriverRatings = completedRidesWithRatings.filter(r => 
      typeof r['Driver Ratings'] === 'number' && r['Driver Ratings'] > 0 && r['Driver Ratings'] <= 5
    );
    
    const validCustomerRatings = completedRidesWithRatings.filter(r => 
      typeof r['Customer Rating'] === 'number' && r['Customer Rating'] > 0 && r['Customer Rating'] <= 5
    );
    
    const avgDriverRating = validDriverRatings.length > 0
      ? validDriverRatings.reduce((sum, r) => sum + r['Driver Ratings'], 0) / validDriverRatings.length
      : 0;
    
    const avgCustomerRating = validCustomerRatings.length > 0
      ? validCustomerRatings.reduce((sum, r) => sum + r['Customer Rating'], 0) / validCustomerRatings.length
      : 0;
    
    const avgRideDistance = completedRides > 0 ? totalDistance / completedRides : 0;
    
    return {
      totalBookings,
      completedRides,
      cancelledByCustomer: Math.round(cancelledByCustomer),
      cancelledByDriver: Math.round(cancelledByDriver),
      incompleteRides: Math.round(incompleteRides),
      noDriverFound,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRideDistance,
      avgDriverRating,
      avgCustomerRating,
      completionRate: totalBookings > 0 ? (completedRides / totalBookings * 100).toFixed(1) : '0.0',
      cancellationRate: totalBookings > 0 
        ? ((cancelledByCustomer + cancelledByDriver) / totalBookings * 100).toFixed(1) 
        : '0.0'
    };
  }, [filteredData]);

  // Vehicle type distribution
  const vehicleTypeData = useMemo(() => {
    const vehicleCounts = {};
    filteredData.forEach(row => {
      const type = row['Vehicle Type'] || 'Unknown';
      vehicleCounts[type] = (vehicleCounts[type] || 0) + 1;
    });
    return Object.entries(vehicleCounts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Payment method distribution
  const paymentMethodData = useMemo(() => {
    const paymentCounts = {};
    filteredData.forEach(row => {
      const method = row['Payment Method'] || 'Unknown';
      paymentCounts[method] = (paymentCounts[method] || 0) + 1;
    });
    return Object.entries(paymentCounts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Time series data for bookings
  const timeSeriesData = useMemo(() => {
    const dateBookings = {};
    filteredData.forEach(row => {
      const date = row.Date;
      if (date && date !== 'null' && date !== '') {
        if (!dateBookings[date]) {
          dateBookings[date] = { date, bookings: 0, revenue: 0, completed: 0, cancelled: 0 };
        }
        dateBookings[date].bookings++;
        
        // Only count revenue for completed rides
        if (row['Booking Status'] && row['Booking Status'].toLowerCase() === 'completed') {
          const bookingValue = row['Booking Value'];
          if (typeof bookingValue === 'number' && !isNaN(bookingValue) && isFinite(bookingValue)) {
            dateBookings[date].revenue += bookingValue;
          }
          dateBookings[date].completed++;
        }
        
        // Count cancellations
        if (row['Booking Status']) {
          const status = row['Booking Status'].toLowerCase();
          if (status === 'cancelled by customer' || status === 'cancelled by driver') {
            dateBookings[date].cancelled++;
          }
        }
      }
    });
    
    return Object.values(dateBookings)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map(d => ({
        ...d,
        revenue: Math.round(d.revenue)
      }));
  }, [filteredData]);

  // Top routes
  const topRoutes = useMemo(() => {
    const routeCounts = {};
    filteredData.forEach(row => {
      const pickup = row['Pickup Location'];
      const drop = row['Drop Location'];
      
      if (pickup && pickup !== 'null' && pickup !== '' && 
          drop && drop !== 'null' && drop !== '') {
        const route = `${pickup} → ${drop}`;
        
        if (!routeCounts[route]) {
          routeCounts[route] = { route, count: 0, revenue: 0 };
        }
        routeCounts[route].count++;
        
        const bookingValue = row['Booking Value'];
        if (typeof bookingValue === 'number' && !isNaN(bookingValue) && isFinite(bookingValue)) {
          routeCounts[route].revenue += bookingValue;
        }
      }
    });
    
    return Object.values(routeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(r => ({
        ...r,
        revenue: Math.round(r.revenue)
      }));
  }, [filteredData]);

  // Cancellation reasons
  const cancellationReasons = useMemo(() => {
    const reasons = {};
    filteredData.forEach(row => {
      if (row['Reason for cancelling by Customer']) {
        const reason = row['Reason for cancelling by Customer'];
        reasons[reason] = (reasons[reason] || 0) + 1;
      }
      if (row['Driver Cancellation Reason']) {
        const reason = row['Driver Cancellation Reason'];
        reasons[reason] = (reasons[reason] || 0) + 1;
      }
    });
    return Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filteredData]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

  const MetricCard = ({ icon: Icon, title, value, trend, color }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                NCR Ride Analytics Dashboard
              </h1>
              <p className="text-gray-600 text-lg">Upload your ride bookings CSV to get started</p>
            </div>
            
            <label className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg cursor-pointer hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl">
              <Upload className="w-6 h-6 mr-3" />
              <span className="text-lg font-semibold">Choose CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            
            {loading && (
              <div className="mt-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Processing your data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              NCR Ride Analytics Dashboard
            </h1>
            <label className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg cursor-pointer hover:from-purple-700 hover:to-blue-700 transition-all">
              <Upload className="w-5 h-5 mr-2" />
              <span>Upload New Data</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 mr-2 text-purple-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={selectedVehicleType}
              onChange={(e) => setSelectedVehicleType(e.target.value)}
            >
              <option value="all">All Vehicle Types</option>
              {[...new Set(data.map(r => r['Vehicle Type']))].filter(Boolean).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            >
              <option value="all">All Payment Methods</option>
              {[...new Set(data.map(r => r['Payment Method']))].filter(Boolean).map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            
            <input 
              type="date" 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              placeholder="Start Date"
            />
            
            <input 
              type="date" 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              placeholder="End Date"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b">
            {['overview', 'analytics', 'performance', 'insights'].map(tab => (
              <button
                key={tab}
                className={`px-6 py-3 font-semibold capitalize transition-colors ${
                  activeTab === tab 
                    ? 'text-purple-600 border-b-2 border-purple-600' 
                    : 'text-gray-600 hover:text-purple-600'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                icon={Activity} 
                title="Total Bookings" 
                value={metrics.totalBookings?.toLocaleString() || 0}
                color="bg-gradient-to-r from-purple-500 to-purple-600"
              />
              <MetricCard 
                icon={DollarSign} 
                title="Total Revenue" 
                value={`₹${Math.round(metrics.totalRevenue || 0).toLocaleString()}`}
                color="bg-gradient-to-r from-green-500 to-green-600"
              />
              <MetricCard 
                icon={Star} 
                title="Avg Driver Rating" 
                value={(metrics.avgDriverRating || 0).toFixed(1)}
                color="bg-gradient-to-r from-yellow-500 to-yellow-600"
              />
              <MetricCard 
                icon={Users} 
                title="Completion Rate" 
                value={`${metrics.completionRate || 0}%`}
                trend={5.2}
                color="bg-gradient-to-r from-blue-500 to-blue-600"
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Booking Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="bookings" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="completed" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Vehicle Type Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={vehicleTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {vehicleTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentMethodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Top Routes</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Route</th>
                      <th className="text-right py-3 px-4">Bookings</th>
                      <th className="text-right py-3 px-4">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRoutes.map((route, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                            {route.route}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{route.count.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">₹{route.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard 
                icon={XCircle} 
                title="Customer Cancellations" 
                value={metrics.cancelledByCustomer?.toLocaleString() || 0}
                color="bg-gradient-to-r from-red-500 to-red-600"
              />
              <MetricCard 
                icon={XCircle} 
                title="Driver Cancellations" 
                value={metrics.cancelledByDriver?.toLocaleString() || 0}
                color="bg-gradient-to-r from-orange-500 to-orange-600"
              />
              <MetricCard 
                icon={AlertCircle} 
                title="Incomplete Rides" 
                value={metrics.incompleteRides?.toLocaleString() || 0}
                color="bg-gradient-to-r from-yellow-500 to-yellow-600"
              />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Cancellation Reasons</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cancellationReasons} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="reason" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Ride Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: metrics.completedRides || 0 },
                        { name: 'Customer Cancelled', value: metrics.cancelledByCustomer || 0 },
                        { name: 'Driver Cancelled', value: metrics.cancelledByDriver || 0 },
                        { name: 'Incomplete', value: metrics.incompleteRides || 0 },
                        { name: 'No Driver Found', value: metrics.noDriverFound || 0 }
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#6b7280" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Average Driver Rating</span>
                      <span className="text-sm font-bold">{(metrics.avgDriverRating || 0).toFixed(2)}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-3 rounded-full"
                        style={{ width: `${(metrics.avgDriverRating || 0) * 20}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Average Customer Rating</span>
                      <span className="text-sm font-bold">{(metrics.avgCustomerRating || 0).toFixed(2)}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full"
                        style={{ width: `${(metrics.avgCustomerRating || 0) * 20}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Peak Performance Metrics</h4>
                  <p className="text-gray-600">Your service has a {metrics.completionRate}% completion rate with an average ride distance of {(metrics.avgRideDistance || 0).toFixed(1)} km.</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Revenue Insights</h4>
                  <p className="text-gray-600">Total revenue of ₹{(metrics.totalRevenue || 0).toLocaleString()} across {metrics.totalBookings} bookings.</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Customer Satisfaction</h4>
                  <p className="text-gray-600">Average driver rating of {(metrics.avgDriverRating || 0).toFixed(1)}/5 indicates strong service quality.</p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Areas for Improvement</h4>
                  <p className="text-gray-600">Cancellation rate of {metrics.cancellationRate}% suggests opportunity for operational enhancement.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Summary Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-purple-100 text-sm">Total Bookings</p>
                  <p className="text-3xl font-bold">{metrics.totalBookings?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-purple-100 text-sm">Revenue</p>
                  <p className="text-3xl font-bold">₹{Math.round(metrics.totalRevenue / 1000)}K</p>
                </div>
                <div>
                  <p className="text-purple-100 text-sm">Avg Distance</p>
                  <p className="text-3xl font-bold">{(metrics.avgRideDistance || 0).toFixed(1)}km</p>
                </div>
                <div>
                  <p className="text-purple-100 text-sm">Success Rate</p>
                  <p className="text-3xl font-bold">{metrics.completionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideAnalyticsDashboard;