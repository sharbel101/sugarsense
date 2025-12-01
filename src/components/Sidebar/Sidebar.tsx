import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './Sidebar.css';
import { selectUser } from '@/features/user/userSlice';
import { clearUserFromStorage } from '@/features/user/userStorage';
import { supabase } from '@/api/supabaseClient';
import { useDispatch } from 'react-redux';
import { resetUser } from '@/features/user/userSlice';
import { fetchDailyLogs } from '@/api/mealsApi';
import type { DailyLog } from '@/api/mealsApi';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose, onLogout }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    const loadDailyLogs = async () => {
      if (!user?.id || !historyExpanded) return;
      
      try {
        setLoading(true);
        const logs = await fetchDailyLogs(user.id);
        setDailyLogs(logs);
      } catch (err) {
        console.error('Failed to load daily logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDailyLogs();
  }, [user?.id, historyExpanded]);


  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleLogoutClick = () => {
    console.log('=== LOGOUT BUTTON CLICKED ===');
    console.log('onLogout prop exists:', !!onLogout);
    
    // Sign out from Supabase auth
    console.log('Attempting Supabase sign-out...');
    try {
      supabase.auth.signOut();
      console.log('✓ Supabase sign-out successful');
    } catch (e) {
      console.error('✗ Error signing out from Supabase', e);
    }

    // Reset Redux user state
    console.log('Dispatching resetUser...');
    try {
      dispatch(resetUser());
      console.log('✓ Redux user reset');
    } catch (e) {
      console.error('✗ Error resetting Redux:', e);
    }

    // Let parent perform its cleanup (if provided)
    console.log('Calling parent onLogout callback...');
    if (onLogout) {
      try {
        onLogout();
        console.log('✓ Parent onLogout callback executed');
      } catch (e) {
        console.error('✗ Error in parent logout', e);
      }
    } else {
      console.warn('! No onLogout callback provided');
    }

    // Ensure persisted profile is removed
    console.log('Clearing local storage...');
    try {
      clearUserFromStorage();
      console.log('✓ Storage cleared');
    } catch (e) {
      console.error('✗ Error clearing storage', e);
    }

    // Use react-router navigation to go to the Login page
    console.log('Navigating to /login...');
    navigate('/login', { replace: true });
    console.log('=== END LOGOUT ===');
  };

  const handleDateClick = (date: string) => {
    navigate(`/history/${date}`);
    onClose?.();
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-40 h-full w-64 transform bg-gradient-to-b from-green-50 to-white transition-transform duration-300 ease-in-out sidebar-container ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col sidebar-inner bg-transparent p-6 shadow-xl overflow-y-auto">
          {/* Header */}
        

          {/* Navigation Menu */}
          <div className="space-y-2 flex-1">
            {/* predict glucose */}
            <div className="sidebar-option">
              <button
                onClick={() => {
                  navigate('/prediction');
                  onClose?.();
                }}
                className="w-full text-left hover:bg-green-100 active:bg-green-200 px-4 py-3 rounded-lg transition flex items-center gap-3 group"
              >
                <span className="w-4 h-4 bg-green-600 rounded-full group-hover:bg-green-700"></span>
                <h3 className="text-sm font-medium text-gray-800 group-hover:text-green-700">Predict Glucose</h3>
              </button>
            </div>

            {/* History Section */}
            <div className="sidebar-option">
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="w-full text-left hover:bg-green-100 active:bg-green-200 px-4 py-3 rounded-lg transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 bg-green-600 rounded-full group-hover:bg-green-700"></span>
                  <h3 className="text-sm font-medium text-gray-800 group-hover:text-green-700">History</h3>
                </div>
                <span 
                  className={`text-lg text-green-600 transition-transform duration-300 ${historyExpanded ? 'rotate-90' : ''}`}
                >
                  &gt;
                </span>
              </button>

              {/* History list */}
              {historyExpanded && (
                <div className="mt-2 space-y-1 pl-6 border-l border-gray-300 bg-gray-50 rounded-r-lg p-3">
                  {loading && (
                    <p className="text-xs text-gray-500 py-2 text-center">Loading...</p>
                  )}
                  {!loading && dailyLogs.length === 0 && (
                    <p className="text-xs text-gray-500 py-2 text-center">No history yet</p>
                  )}
                  {dailyLogs.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => handleDateClick(log.log_date)}
                      className="w-full text-left hover:bg-green-200 active:bg-green-300 px-2 py-2 rounded transition text-xs group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700 group-hover:text-green-800">
                          {formatFullDate(log.log_date)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Carbs:</span>
                          <span className="font-medium">{log.total_carbs.toFixed(1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insulin:</span>
                          <span className="font-medium">{Math.round(log.total_insulin)}U</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="sidebar-option">
              <button
                onClick={() => {
                  navigate('/settings');
                  onClose?.();
                }}
                className="w-full text-left hover:bg-green-100 active:bg-green-200 px-4 py-3 rounded-lg transition flex items-center gap-3 group"
              >
                <span className="w-4 h-4 bg-green-600 rounded-full group-hover:bg-green-700"></span>
                <h3 className="text-sm font-medium text-gray-800 group-hover:text-green-700">Settings</h3>
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full rounded-lg bg-gray-200 hover:bg-gray-300 active:bg-gray-400 px-4 py-2.5 text-xs font-semibold text-gray-700 shadow transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden sidebar-overlay backdrop-blur-sm"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
