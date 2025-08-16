# 🔐 Guardflow Admin User Setup Guide

## Overview
Guardflow uses a **role-based admin system** instead of hardcoded admin credentials. This provides better security, scalability, and multi-tenant support.

## 🚀 Quick Setup

### **Create Your First Admin User**

```bash
cd guardflow-backend
python create_admin_user.py --interactive
```

**Interactive Prompts:**
```
Enter admin email: admin@yourcompany.com
Enter admin full name: John Smith
Enter organization/tenant name [Default Organization]: 
Create as super admin? (can manage multiple tenants) [y/N]: y
Enter password (hidden): ********
Confirm password: ********
```

## 👥 Admin Roles Explained

### **Admin (`admin`)**
- **Scope**: Single tenant/organization
- **Permissions**: 
  - User management within tenant
  - Analytics access
  - API access management
  - Chat/proxy access

### **Super Admin (`super_admin`)**
- **Scope**: System-wide (all tenants)
- **Permissions**:
  - Everything an admin can do
  - Tenant management
  - System administration
  - Cross-tenant operations

## 🏢 Multi-Tenant Setup

### **Create Organization Admin**
```bash
python create_admin_user.py \
  --email "admin@company.com" \
  --name "Company Admin" \
  --tenant "Company Inc"
```

### **Create Super Admin**
```bash
python create_admin_user.py \
  --email "superadmin@platform.com" \
  --name "Platform Admin" \
  --super-admin
```

## 📝 Command Reference

### **Interactive Mode** (Recommended)
```bash
python create_admin_user.py --interactive
```

### **Command Line Mode**
```bash
python create_admin_user.py \
  --email "admin@example.com" \
  --name "Admin Name" \
  --tenant "Organization Name" \
  [--super-admin]
```

### **Options**
- `--interactive` - Run in interactive mode (recommended)
- `--email` - Admin email address
- `--name` - Admin full name  
- `--tenant` - Organization/tenant name (default: "Default Organization")
- `--super-admin` - Create as super admin (system-wide access)

## 🔒 Security Best Practices

### **Password Requirements**
- ✅ Minimum 8 characters
- ✅ Use strong, unique passwords
- ✅ Consider using password managers

### **Admin Management**
- ✅ Create separate admin accounts (don't share)
- ✅ Use regular `admin` role unless system-wide access needed
- ✅ Regularly audit admin users
- ✅ Remove unused admin accounts

### **Production Setup**
- ✅ Use strong passwords in production
- ✅ Enable 2FA if available
- ✅ Monitor admin activity logs
- ✅ Regular security reviews

## 🏗️ Development Workflow

### **Local Development**
```bash
# Create development admin
python create_admin_user.py \
  --email "dev@localhost" \
  --name "Dev Admin" \
  --tenant "Development"
```

### **Production Deployment**
```bash
# During production setup
python create_admin_user.py --interactive

# Choose production-grade credentials
# Document admin credentials securely
```

## 🔄 Migration from Legacy System

### **If You Have Old ADMIN_EMAIL Setup**
1. **Create new role-based admin:**
   ```bash
   python create_admin_user.py --interactive
   ```

2. **Test the new admin:**
   - Login with new credentials
   - Verify admin functionality works

3. **Clean up environment:**
   - Remove `ADMIN_EMAIL` from `.env` files
   - Update deployment scripts

### **Backward Compatibility**
- Legacy code references are now deprecated
- System will work without `ADMIN_EMAIL` settings
- Old admin users (if any) still work but lack proper roles

## 📊 Admin Features Available

### **User Management**
- Create/edit/delete users
- Block/unblock users
- Assign tasks to users
- Manage API keys

### **Analytics & Monitoring**
- Usage analytics
- System health monitoring  
- User behavior tracking
- Alert management

### **System Administration**
- Task management
- Quota configuration
- Rate limiting
- Tenant administration (super admin)

## 🐛 Troubleshooting

### **Common Issues**

**"User already exists"**
```bash
# Check if user exists in database
# Use different email or contact existing admin
```

**"Admin privileges required"**
```bash
# Verify user has admin or super_admin role
# Re-create user with proper role
```

**"Database connection error"**
```bash
# Verify database is running
# Check DATABASE_URL in environment
# Run database migrations first
```

### **Verify Admin Setup**
```bash
# Test admin creation worked
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "yourpassword"}'

# Should return JWT token
```

## 📚 Related Documentation

- [Production Deployment Guide](guardflow-backend/PRODUCTION_DEPLOYMENT.md)
- [API Documentation](http://localhost:8000/docs) 
- [Multi-tenant Architecture](docs/architecture/multi-tenant.md)
- [Security Best Practices](docs/security/README.md)

## 🆘 Need Help?

- Check the troubleshooting section above
- Review server logs for error details
- Ensure all database migrations are applied
- Verify environment configuration is correct

---

**✅ Your Guardflow admin system is now properly configured with role-based security!**