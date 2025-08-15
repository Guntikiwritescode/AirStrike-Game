# SSR Compatibility Checklist - Browser API Safety

## 🚫 **Issue Resolved**: `ReferenceError: navigator is not defined`

### **Root Cause**: Browser-only APIs accessed during server-side rendering of `/game` page

## 🛡️ **Browser-Only APIs That Require Guards**

### **❌ Always Problematic in SSR**
```javascript
// These will crash during prerendering:
navigator.userAgent          // ❌ ReferenceError: navigator is not defined
navigator.clipboard          // ❌ ReferenceError: navigator is not defined  
window.location.href         // ❌ ReferenceError: window is not defined
document.createElement()     // ❌ ReferenceError: document is not defined
localStorage.getItem()       // ❌ ReferenceError: localStorage is not defined
sessionStorage.setItem()     // ❌ ReferenceError: sessionStorage is not defined
```

### **✅ Safe SSR Patterns**
```javascript
// Proper browser environment checks:
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
const currentUrl = typeof window !== 'undefined' ? window.location.href : 'unknown';
const hasLocalStorage = typeof localStorage !== 'undefined';

// Conditional API usage:
if (typeof navigator !== 'undefined' && navigator.clipboard) {
  navigator.clipboard.writeText(text);
}

// useEffect for client-only code:
useEffect(() => {
  // Safe to use browser APIs here - only runs on client
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## 🔍 **Pre-Deployment Checklist**

### **1. Component Review**
```bash
# Search for potential SSR issues:
grep -r "navigator\." components/
grep -r "window\." components/
grep -r "document\." components/
grep -r "localStorage" components/
grep -r "sessionStorage" components/
```

### **2. Function-Level Checks**
- [ ] **Event handlers**: Usually safe (only called client-side)
- [ ] **useEffect hooks**: Usually safe (only run client-side)
- [ ] **Utility functions**: ⚠️ DANGER - may be called during SSR
- [ ] **Component render**: ⚠️ DANGER - always runs during SSR
- [ ] **Initial state**: ⚠️ DANGER - evaluated during SSR

### **3. Critical Guard Patterns**

#### **✅ Safe Utility Function Pattern**
```javascript
const copyDiagnostics = () => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    hasStorage: typeof localStorage !== 'undefined',
  };

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
  }
};
```

#### **✅ Safe Initial State Pattern**
```javascript
const [deviceInfo, setDeviceInfo] = useState(() => ({
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  viewport: typeof window !== 'undefined' ? { 
    width: window.innerWidth, 
    height: window.innerHeight 
  } : { width: 1920, height: 1080 }
}));
```

#### **✅ Safe Effect Pattern**
```javascript
useEffect(() => {
  // All browser APIs safe here - client-side only
  const updateDeviceInfo = () => {
    setDeviceInfo({
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    });
  };
  
  updateDeviceInfo();
  window.addEventListener('resize', updateDeviceInfo);
  return () => window.removeEventListener('resize', updateDeviceInfo);
}, []);
```

## 🧪 **Testing SSR Compatibility**

### **1. Build Test (Catches SSR Errors)**
```bash
# This will fail if SSR issues exist:
pnpm build
```

### **2. Production Preview**
```bash
# Test actual prerendered content:
pnpm build && pnpm start
curl http://localhost:3000/game | grep -o "navigator\|window\|document"
```

### **3. Next.js Prerender Debug**
```bash
# Enable detailed prerender logging:
DEBUG=1 pnpm build
```

## 📋 **Quick Reference Guide**

| API | SSR Safe? | Guard Pattern |
|-----|-----------|---------------|
| `navigator.userAgent` | ❌ | `typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'` |
| `navigator.clipboard` | ❌ | `typeof navigator !== 'undefined' && navigator.clipboard` |
| `window.location` | ❌ | `typeof window !== 'undefined' ? window.location.href : 'unknown'` |
| `window.innerWidth` | ❌ | Use in `useEffect` or guard with `typeof window !== 'undefined'` |
| `document.createElement` | ❌ | Use in `useEffect` or event handlers only |
| `localStorage` | ❌ | `typeof localStorage !== 'undefined' && localStorage.getItem()` |
| `sessionStorage` | ❌ | `typeof sessionStorage !== 'undefined' && sessionStorage.setItem()` |
| `Date`, `Math`, `JSON` | ✅ | Safe everywhere |
| `fetch` (with Node polyfill) | ✅ | Safe everywhere |
| `console.log` | ✅ | Safe everywhere |

## 🎯 **Fixed Example: DiagnosticStepper**

### **❌ Before (SSR Error)**
```javascript
const copyDiagnostics = () => {
  const diagnostics = {
    userAgent: navigator.userAgent,        // ❌ Crashes SSR
    url: window.location.href,             // ❌ Crashes SSR
  };
  navigator.clipboard.writeText(text);     // ❌ Crashes SSR
};
```

### **✅ After (SSR Safe)**
```javascript
const copyDiagnostics = () => {
  const diagnostics = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
  }
};
```

## 🎉 **Result: Zero SSR Errors**

- **✅ Build succeeds** without ReferenceError crashes
- **✅ Prerendering works** for all pages including `/game`
- **✅ Client functionality** remains fully intact
- **✅ Graceful fallbacks** for server-side execution
- **✅ Type safety** maintained throughout

**Never again will browser API access crash server-side rendering!**