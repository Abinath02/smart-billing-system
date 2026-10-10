# 🍽️ Smart Restaurant Billing & Order Management System
## Official Project Submission & User Evaluation Manual

---

### 📌 Project Overview
The **Smart Restaurant Billing & Order Management System** is a cloud-based, multi-role restaurant automation platform designed to eliminate paper-based ordering, streamline kitchen communication, automate inventory tracking, and speed up cashier settlement.

* **Live Cloud Deployment URL**: [https://smart-billing-system-blond.vercel.app](https://smart-billing-system-blond.vercel.app)
* **Database & Auth Backend**: Supabase Cloud (PostgreSQL with Row Level Security)
* **Frontend Architecture**: Next.js (React) + TypeScript + Tailwind CSS

---

## 🌐 1. System Module URLs & Access Directory

| Role / Module | Direct Web URL | Login Required? | Access Permissions |
| :--- | :--- | :--- | :--- |
| **Customer Dine-in (QR Menu)** | `https://smart-billing-system-blond.vercel.app/?table=T-01` | ❌ **No Login** | Browse menu, filter items, add to cart, submit live table orders |
| **Kitchen Display System (KDS)** | `https://smart-billing-system-blond.vercel.app/kitchen` | ✅ **Yes** | View live orders (5s auto-refresh), update cooking stages, log raw material usage |
| **Cashier Counter (POS)** | `https://smart-billing-system-blond.vercel.app/cashier` | ✅ **Yes** | Bill generation, automated 5% GST, UPI/Cash/Card/Split settlement, PDF invoices |
| **Admin Management Portal** | `https://smart-billing-system-blond.vercel.app/admin` | ✅ **Yes** | Staff account creation, menu & pricing management, inventory control & email alerts |

---

## 🔑 2. Testing Accounts & Credentials

### A. Admin Account
* **URL**: [https://smart-billing-system-blond.vercel.app/admin](https://smart-billing-system-blond.vercel.app/admin)
* **Email**: `mrd426004@gmail.com`
* **Password**: `Password123!` *(or the password set during creation)*
* **Master Admin Passcode**: `ADMIN2026` *(used for administrative overrides or initial admin setup)*

### B. Kitchen Staff Account
* **URL**: [https://smart-billing-system-blond.vercel.app/kitchen](https://smart-billing-system-blond.vercel.app/kitchen)
* **Email**: `ajith@gmail.com`
* **Password**: `Password123!` *(or custom staff password created in Admin panel)*

### C. Cashier Staff Account
* **URL**: [https://smart-billing-system-blond.vercel.app/cashier](https://smart-billing-system-blond.vercel.app/cashier)
* **Creation**: Can be created directly by the Admin via the **Admin Portal -> Staff Management** tab.

> 🔒 **Security Notice**: 
> Customer pages contain **NO login buttons, NO staff navigation, and NO access to management pages**. Staff and Admin accounts are isolated by role checks; unauthorized access is immediately redirected to the appropriate login portal.

---

## 📱 3. Table QR Code Generation & Setup Guide

Customers access the digital menu by scanning a QR code placed on their dining table. The system automatically reads the table number from the URL parameter `?table=...` without needing customer authentication.

### QR Code URL Structure:
* **Table 1**: `https://smart-billing-system-blond.vercel.app/?table=T-01`
* **Table 2**: `https://smart-billing-system-blond.vercel.app/?table=T-02`
* **Table 3**: `https://smart-billing-system-blond.vercel.app/?table=T-03`
* **Table 4**: `https://smart-billing-system-blond.vercel.app/?table=T-04`
* **Table 5**: `https://smart-billing-system-blond.vercel.app/?table=T-05`
*(You can use any table identifier such as `T-01`, `TABLE_5`, `VIP-1`, etc.)*

### How to Create & Print Table QR Codes:
1. Open any free QR code generator (e.g., [qr-code-generator.com](https://www.qr-code-generator.com/) or Canva).
2. Paste the target table URL (e.g., `https://smart-billing-system-blond.vercel.app/?table=T-01`).
3. Download the QR code as high-resolution PNG or SVG.
4. Print the QR code cards and place them on the respective restaurant dining tables.
5. When a diner scans the QR code with their mobile camera, the menu opens instantly with Table `T-01` locked in, and all orders are routed directly to the kitchen with that table number.

---

## 🧪 4. Complete End-to-End Evaluation & Testing Workflow

Follow these 5 testing steps to test every single feature of the system:

### 📍 Step 1: Admin Portal Configuration
1. Open **[https://smart-billing-system-blond.vercel.app/admin](https://smart-billing-system-blond.vercel.app/admin)**.
2. Sign in with `mrd426004@gmail.com`.
3. **Staff Management**:
   * Click **Staff Management** tab.
   * Add a new staff member (Name, Email, Role: `kitchen` or `cashier`, Password).
   * Note that only Admins can create staff accounts.
4. **Food Menu & Pricing Management**:
   * Click **Menu & Pricing** tab.
   * View live food items, categories (Biryani, Burger, Drinks, Desserts), and prices.
   * Click **"Seed Standard Menu"** to load standard restaurant items with updated prices if empty.
   * Edit or update any item's price inline and click save.
5. **Raw Material Inventory Tracking**:
   * Click **Inventory Stock** tab.
   * Review primary raw materials (e.g., Basmati Rice, Chicken, Cooking Oil, Burger Buns, Salt, Sugar).
   * Notice current stock levels, units (kg, liters, pcs), and alert thresholds.
   * If any item falls below the minimum threshold, click **"Test Stock Alert Email"** to trigger an automated notification to `mrd426004@gmail.com`.

---

### 📍 Step 2: Customer Dine-in Ordering (Mobile / Browser Test)
1. Open **[https://smart-billing-system-blond.vercel.app/?table=T-01](https://smart-billing-system-blond.vercel.app/?table=T-01)** in an Incognito browser window or on a mobile phone.
2. Confirm the page displays:
   * **Table T-01 Badge** at the top.
   * **Clean Customer Interface**: No admin links, no cashier buttons, no login required.
3. Browse food categories (Starters, Main Course, Fast Food, Beverages).
4. Add items to cart (e.g., 2x Chicken Biryani, 1x Fresh Lime Soda).
5. Open Cart, verify total price calculation, and click **"Place Order"**.
6. The screen confirms: **"Order Placed Successfully! Sent to Kitchen"** with an Order Reference Number.

---

### 📍 Step 3: Kitchen Display System (KDS) Live Verification
1. Open **[https://smart-billing-system-blond.vercel.app/kitchen](https://smart-billing-system-blond.vercel.app/kitchen)** on a tablet or desktop display.
2. Log in using the Kitchen Staff account (`ajith@gmail.com`).
3. Observe the **KDS Dashboard**:
   * **5-Second Auto-Refresh Engine**: The screen automatically polls the database every 5 seconds (green pulsing indicator).
   * **Audio Chime**: An audible alert chimes when a new order arrives.
   * The new order from **Table T-01** immediately appears on the kitchen board.
4. Click order status buttons to advance the ticket:
   * Click **"Start Cooking"** (Status changes to `in_kitchen`).
   * Click **"Order Ready"** (Status changes to `ready`).
5. **Kitchen Raw Material Store Withdrawal**:
   * Switch to the **"Kitchen Raw Materials"** tab.
   * Kitchen staff can log daily raw materials used (e.g., 5 kg Basmati Rice, 2 kg Chicken, 1 kg Salt).
   * Click **"Deduct Stock"**; inventory automatically updates in real-time.

---

### 📍 Step 4: Cashier Counter (POS) Settlement & Invoicing
1. Open **[https://smart-billing-system-blond.vercel.app/cashier](https://smart-billing-system-blond.vercel.app/cashier)**.
2. Log in with a Cashier account.
3. Observe active table orders:
   * Find **Table T-01** with the ready order.
4. Click on the order to open the **Bill Settlement Window**:
   * Subtotal calculated automatically.
   * Automated **5% GST** breakdown applied.
   * Option to enter a special restaurant discount.
5. Select the payment method:
   * **Cash**
   * **UPI / Dynamic QR Code** (generates on-screen QR for customer phone scan)
   * **Card**
   * **Split Payment** (allows customer to pay partly in Cash and partly via UPI/Card)
6. Click **"Settle Bill & Print Invoice"**:
   * Generates a thermal/A4 tax invoice PDF with restaurant name, tax breakdown, and date.
   * Order status is marked as `settled`/`completed`.
   * Table T-01 is freed up for the next customer.

---

### 📍 Step 5: Inventory Low-Stock Alert & Email Automation
1. When raw material stocks reach critical levels:
   * Example: Basmati Rice drops below 10 kg or Burger Buns drop below 20 pcs.
2. The inventory service sends an automatic low-stock email alert to:
   * **Target Email**: `mrd426004@gmail.com`
   * **Email Subject**: `⚠️ LOW STOCK ALERT: Smart Restaurant Inventory`
   * **Email Content**: Exact item names, current remaining quantity, minimum required threshold, and restocking action required.

---

## 🛡️ 5. Key System Highlights & Architecture Highlights

| Feature | Technical Implementation | Benefit |
| :--- | :--- | :--- |
| **100% Guest Friendly** | URL parameter binding (`?table=...`) | Zero barriers; customers order in seconds without downloading apps or creating accounts. |
| **Real-time Kitchen Sync** | 5-second interval heartbeat + Supabase DB sync | Kitchen staff never miss an order; no manual browser refresh required. |
| **Strict Role Isolation** | Supabase Row Level Security + Next.js Route Guards | Kitchen/Cashier cannot tamper with Admin settings or user accounts. |
| **Dynamic Raw Material Tracking** | `inventory_items` + `inventory_logs` relational schema | Full transparency on raw ingredient usage (rice, oil, salt, buns) to prevent wastage. |
| **Comprehensive POS** | Multi-mode tender (Cash, UPI QR, Card, Split) + 5% GST | Compliance-ready billing with printable tax invoices. |

---

## 👨‍💻 Submission Verification Checklist

- [x] Admin Portal accessible at `/admin` with staff creation & menu controls.
- [x] Kitchen Portal accessible at `/kitchen` with 5s auto-sync & raw material logging.
- [x] Cashier Portal accessible at `/cashier` with GST calculation & invoice generation.
- [x] Customer Menu accessible at `/?table=T-01` with zero login overhead.
- [x] Low stock email alerts configured to notify `mrd426004@gmail.com`.
- [x] Database policies and tables verified on Supabase Cloud.
- [x] Production code deployed live on Vercel.

---
*Manual prepared for office project submission, system demonstration, and faculty/stakeholder evaluation.*
