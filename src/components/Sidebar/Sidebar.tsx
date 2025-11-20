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
        className={`fixed left-0 top-0 z-40 h-full w-64 transform bg-white transition-transform duration-300 ease-in-out sidebar-container ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col sidebar-inner bg-gray-50 p-4 shadow-lg overflow-y-auto">
          <div className="mb-8 space-y-4">
            {/* New Chat */}
            <div className="sidebar-option">
              <button
                onClick={() => {
                  navigate('/chat');
                  onClose?.();
                }}
                className="w-full text-left hover:bg-gray-200 p-2 rounded-lg transition"
              >
                <h3 className="text-lg font-semibold text-gray-800">New Chat</h3>
              </button>
            </div>

            {/* History Section */}
            <div className="sidebar-option">
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="w-full text-left hover:bg-gray-200 p-2 rounded-lg transition flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold text-gray-800">History</h3>
                <span 
                  className={`text-2xl font-bold text-green-600 transition-transform duration-300 ${historyExpanded ? 'rotate-90' : ''}`}
                >
                  &gt;
                </span>
              </button>

              {/* History list */}
              {historyExpanded && (
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-green-300">
                  {loading && <p className="text-xs text-gray-500 py-2">Loading...</p>}
                  {!loading && dailyLogs.length === 0 && (
                    <p className="text-xs text-gray-500 py-2">No history yet</p>
                  )}
                  {dailyLogs.map((log) => (
                    <button
                      key={log.id}
                      onClick={() => handleDateClick(log.log_date)}
                      className="w-full text-left hover:bg-green-100 p-2 rounded-lg transition text-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">
                          {formatFullDate(log.log_date)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <div>{log.total_carbs.toFixed(1)}g carbs</div>
                        <div>{log.total_insulin.toFixed(1)} units</div>
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
                className="w-full text-left hover:bg-gray-200 p-2 rounded-lg transition flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold text-gray-800">Settings</h3>
                <span className="text-2xl font-bold text-green-600">⚙</span>
              </button>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden sidebar-overlay"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
