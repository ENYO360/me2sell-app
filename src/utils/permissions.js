// Check if staff has access to a department
export const canAccessDepartment = (permissions, departmentId) => {
  if (!permissions) return false;
  if (permissions.departments === 'all') return true;
  return permissions.departments?.includes(departmentId) || false;
};

// Check if staff has access to a category
export const canAccessCategory = (permissions, categoryId) => {
  if (!permissions) return false;
  if (permissions.categories === 'all') return true;
  return permissions.categories?.includes(categoryId) || false;
};

// Check if staff can edit stock
export const canEditStock = (permissions) => {
  return permissions?.canEditStock || false;
};

// Check if staff can delete products
export const canDeleteProducts = (permissions) => {
  return permissions?.canDeleteProducts || false;
};

// Check if staff can view all sales
export const canViewAllSales = (permissions) => {
  return permissions?.canViewAllSales || false;
};

// Check if staff can process refunds
export const canProcessRefunds = (permissions) => {
  return permissions?.canProcessRefunds || false;
};

// Check if staff can manage customers
export const canManageCustomers = (permissions) => {
  return permissions?.canManageCustomers || false;
};

// Check if staff can access reports
export const canAccessReports = (permissions) => {
  return permissions?.canAccessReports || false;
};

// Check if staff can manage pricing
export const canManagePricing = (permissions) => {
  return permissions?.canManagePricing || false;
};

// Check if staff can export data
export const canExportData = (permissions) => {
  return permissions?.canExportData || false;
};

// Get permissions from localStorage
export const getStaffPermissions = () => {
  const perms = localStorage.getItem('staffPermissions');
  return perms ? JSON.parse(perms) : null;
};

// Check if user is staff
export const isStaff = () => {
  return localStorage.getItem('userRole') === 'staff';
};

// Check if user is admin
export const isAdmin = () => {
  return localStorage.getItem('userRole') === 'admin';
};