// src/pages/ExpenseTracking.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import AddExpenseDialog from "../components/Expenses/AddExpenseDialog";
import ExpenseTable from "../components/Expenses/ExpenseTable";
import ExpenseSummary from "../components/Expenses/ExpenseSummary";
import ExpenseFilterBar from "../components/Expenses/ExpenseFilterBar";
// import ExpenseAnalysis from "../components/Expenses/ExpenseAnalysis";
import ExpensePrintView from "../components/Expenses/ExpensePrintView";
import { exportToExcel } from "../utils/exportToExcel";
import { useTranslation } from "react-i18next";

export default function ExpenseTracking() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [printViewOpen, setPrintViewOpen] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    category: "",
    paymentStatus: "",
    sortBy: "date",
  });

  const { t } = useTranslation();
  // Fetch farms on component mount
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const farmsRef = collection(db, `users/${currentUser.uid}/farms`);
        const querySnapshot = await getDocs(farmsRef);
        const farmsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFarms(farmsData);
      } catch (error) {
        console.error("Error fetching farms:", error);
        setError("Failed to load farms");
      }
    };

    fetchFarms();
  }, [currentUser.uid]);

  const fetchExpenses = async () => {
    if (!selectedFarm) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const expensesRef = collection(
        db,
        `users/${currentUser.uid}/farms/${selectedFarm}/expenses`
      );
      const querySnapshot = await getDocs(expensesRef);
      const expensesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(expensesData);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  // Fetch expenses when farm is selected
  useEffect(() => {
    fetchExpenses();
  }, [selectedFarm]);

  const handleFarmChange = (event) => {
    setSelectedFarm(event.target.value);
  };

  const handleExpenseAdded = () => {
    fetchExpenses();
  };

  const filteredExpenses = expenses
    .filter((expense) => {
      const date = expense.date.toDate();

      if (filters.fromDate && new Date(filters.fromDate) > date) return false;
      if (filters.toDate && new Date(filters.toDate) < date) return false;
      if (filters.category && expense.category !== filters.category)
        return false;
      if (
        filters.paymentStatus &&
        expense.paymentStatus !== filters.paymentStatus
      )
        return false;

      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "amount":
          return b.amount - a.amount;
        case "category":
          return a.category.localeCompare(b.category);
        case "date":
        default:
          return b.date.toDate() - a.date.toDate();
      }
    });

  const handleExport = () => {
    const selectedFarmName =
      farms.find((farm) => farm.id === selectedFarm)?.farmName || "Farm";
    exportToExcel(filteredExpenses, selectedFarmName);
  };

  const getCurrentFarmName = () => {
    return farms.find((farm) => farm.id === selectedFarm)?.farmName || "";
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight="600">
          {t("expense.heading")}
        </Typography>
        <Box>
          {selectedFarm && expenses.length > 0 && (
            <>
              <Button
                variant="outlined"
                onClick={() => setPrintViewOpen(true)}
                sx={{ mr: 1 }}
              >
                {t("expense.printReport")}
              </Button>
              <Button variant="outlined" onClick={handleExport} sx={{ mr: 2 }}>
                {t("expense.exportReport")}
              </Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
            disabled={!selectedFarm}
          >
            {t("expense.addExpense")}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Farm Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t("expense.selectFarm")}</InputLabel>
                <Select
                  value={selectedFarm}
                  onChange={handleFarmChange}
                  label={t("expense.selectFarm")}
                >
                  <MenuItem value="">
                    <em>{t("expense.selectAFarm")}</em>
                  </MenuItem>
                  {farms.map((farm) => (
                    <MenuItem key={farm.id} value={farm.id}>
                      {farm.farmName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selectedFarm && (
        <ExpenseFilterBar
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={() =>
            setFilters({
              fromDate: "",
              toDate: "",
              category: "",
              paymentStatus: "",
              sortBy: "date",
            })
          }
        />
      )}

      {/* Expense Summary */}
      {selectedFarm && filteredExpenses.length > 0 && (
        <ExpenseSummary expenses={filteredExpenses} />
      )}

      {/* Expense Analysis
      {selectedFarm && filteredExpenses.length > 0 && (
        <ExpenseAnalysis expenses={filteredExpenses} />
      )} */}

      {/* Expense Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : selectedFarm ? (
        <ExpenseTable
          expenses={filteredExpenses}
          farmId={selectedFarm}
          onExpenseUpdated={fetchExpenses}
        />
      ) : (
        <Card sx={{ textAlign: "center", py: 5 }}>
          <CardContent>
            <Typography color="text.secondary">
              {t("expense.pleaseSelectFarm")}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        farmId={selectedFarm}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* Print View Dialog */}
      <ExpensePrintView
        open={printViewOpen}
        onClose={() => setPrintViewOpen(false)}
        expenses={filteredExpenses}
        farmName={getCurrentFarmName()}
      />
    </Box>
  );
}
