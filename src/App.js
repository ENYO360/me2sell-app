import './index.css';
import GlobalLoader from './pages/GlobalLoader';
import { useLoading } from './context/LoadingContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Home from './pages/Home';
import { Router, Route, Routes} from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Overview from './pages/dashboard/Overview';
import Products from './pages/dashboard/Products';
import Cart from './pages/dashboard/Cart';
import SalesHistory from './pages/dashboard/SalesHistory';
import Departments from './pages/dashboard/Departments';
import DashboardHome from './pages/dashboard/O_DashboardHome';
import Categories from './pages/dashboard/Categories';
import Profile from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';
import ConfirmationModal from './pages/dashboard/ConfirmationModal';
import StaffManagement from './pages/dashboard/StaffManagement';
import StaffLogin from './pages/staff/StaffLogin';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffProducts from './pages/staff/StaffProducts';
import StaffCart from './pages/staff/StaffCart';
import StaffSalesHistory from './pages/staff/StaffSalesHistory';
import HowItWorks from './pages/HowItWorks';
import Support from './pages/Support';
import EnyotronicsPage from './pages/EnyotronicsPage';
import ProfileSetup from './pages/SetupProfile';
import ForgotPassword from './pages/ForgotPassword';
import NetworkBanner from './pages/dashboard/NetworkBanner';
import BuyerMarketplace from './pages/marketplace/MarketplaceHome';
import SellerProfile from './pages/marketplace/SellerProfile';

function App() {
  const { loading } = useLoading();

  return (
    <>
      <NetworkBanner />
      <GlobalLoader show={loading} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={
            <ProtectedRoute requireAdmin={true}>
              <DashboardHome />
            </ProtectedRoute>
            } 
          />
          <Route path="/dashboard/overview" element={
            <ProtectedRoute requireAdmin={true}>
              <Overview />
            </ProtectedRoute>
            } />
          <Route path="/dashboard/products" element={
            <ProtectedRoute requireAdmin={true}>
              <Products />
            </ProtectedRoute>
            } 
          />
          <Route path="/dashboard/cart" element={
            <ProtectedRoute requireAdmin={true}>
              <Cart />
            </ProtectedRoute>
            } />
          <Route path="/dashboard/sales-history" element={
            <ProtectedRoute requireAdmin={true}>
              <SalesHistory />
            </ProtectedRoute>
            } />
          <Route path="/dashboard/departments" element={
            <ProtectedRoute requireAdmin={true}>
              <Departments />
            </ProtectedRoute>
            } />
          <Route path="/dashboard/categories" element={
            <ProtectedRoute requireAdmin={true}>
              <Categories />
            </ProtectedRoute>
            } />
          <Route path="/dashboard/profile" element={
            <ProtectedRoute requireAdmin={true}>
              <Profile />
            </ProtectedRoute>
            } />
          <Route path="/dashboard/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
            } />
          <Route path="/how-it-works" element={<HowItWorks/>} />
          <Route path="/dashboard/staff" element={
            <ProtectedRoute requireAdmin={true}>
              <StaffManagement />
            </ProtectedRoute>
            } />
          <Route path="/staff/dashboard" element={
            <ProtectedRoute requireAdmin={false}>
              <StaffDashboard />
            </ProtectedRoute>
            } />
          <Route path="/staff/products" element={
            <ProtectedRoute requireAdmin={false}>
              <StaffProducts />
            </ProtectedRoute>
            } />
          <Route path="/staff/cart" element={
            <ProtectedRoute requireAdmin={false}>
              <StaffCart />
            </ProtectedRoute>
            } />
          <Route path="/staff/sales-history" element={
            <ProtectedRoute requireAdmin={false}>
              <StaffSalesHistory />
            </ProtectedRoute>
            } />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/support" element={<Support />} />
          <Route path="/enyotronics" element={<EnyotronicsPage />} />
          <Route path="/setup-profile" element={<ProfileSetup />} />
          <Route path="/marketplace" element={<BuyerMarketplace />} />
          <Route path="/seller/:sellerId" element={<SellerProfile />} />
        </Routes>
        <ConfirmationModal />
    </>
  );
}

export default App;
