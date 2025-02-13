// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Agriculture as FarmIcon,
  AccountBalance as ExpenseIcon,
  Pending as PendingIcon,
  Done as PaidIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import RecentExpenses from "../components/Dashboard/RecentExpenses";
import ExpenseOverview from "../components/Dashboard/ExpenseOverview";
import FarmSummary from "../components/Dashboard/FarmSummary";
import QuickStats from "../components/Dashboard/QuickStats";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState({
    farms: [],
    recentExpenses: [],
    stats: {
      totalFarms: 0,
      totalExpenses: 0,
      pendingAmount: 0,
      paidAmount: 0,
    },
  });

  const { t } = useTranslation();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch farms
        const farmsRef = collection(db, `users/${currentUser.uid}/farms`);
        const farmsSnapshot = await getDocs(farmsRef);
        const farmsData = farmsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch expenses for each farm
        let allExpenses = [];
        let totalExpenses = 0;
        let pendingAmount = 0;
        let paidAmount = 0;

        for (const farm of farmsData) {
          const expensesRef = collection(
            db,
            `users/${currentUser.uid}/farms/${farm.id}/expenses`
          );
          const expensesSnapshot = await getDocs(expensesRef);
          const farmExpenses = expensesSnapshot.docs.map((doc) => ({
            id: doc.id,
            farmId: farm.id,
            farmName: farm.farmName,
            ...doc.data(),
          }));

          allExpenses = [...allExpenses, ...farmExpenses];

          // Calculate totals
          farmExpenses.forEach((expense) => {
            totalExpenses += expense.amount;
            if (expense.paymentStatus === "Paid") {
              paidAmount += expense.amount;
            } else {
              pendingAmount += expense.amount;
            }
          });
        }

        // Sort expenses by date (most recent first)
        allExpenses.sort((a, b) => b.date.toDate() - a.date.toDate());

        setDashboardData({
          farms: farmsData,
          recentExpenses: allExpenses.slice(0, 5), // Get only 5 most recent expenses
          stats: {
            totalFarms: farmsData.length,
            totalExpenses,
            pendingAmount,
            paidAmount,
          },
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser.uid]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="600" gutterBottom>
        {t("dashboard.heading")}
      </Typography>

      {/* Quick Stats */}
      <QuickStats stats={dashboardData.stats} />

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Farm Summary */}
        <Grid item xs={12} md={6}>
          <FarmSummary farms={dashboardData.farms} />
        </Grid>

        {/* Expense Overview */}
        <Grid item xs={12} md={6}>
          <ExpenseOverview expenses={dashboardData.recentExpenses} />
        </Grid>

        {/* Recent Expenses */}
        <Grid item xs={12}>
          <RecentExpenses expenses={dashboardData.recentExpenses} />
        </Grid>
      </Grid>
    </Box>
  );
}
