// src/pages/FarmManagement.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import {
  collection,
  query,
  getDocs,
  deleteDoc,
  doc,
  where,
  orderBy,
} from "firebase/firestore";
import AddFarmDialog from "../components/Farms/AddFarmDialog";
import EditFarmDialog from "../components/Farms/EditFarmDialog";
import FarmCard from "../components/Farms/FarmCard";
import FarmFilters from "../components/Farms/FarmFilters";
import { CropsComponent } from "../constants/crops";
import { useTranslation } from "react-i18next";

export default function FarmManagement() {
  const crops = CropsComponent();

  const { currentUser } = useAuth();
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    cropCategory: "",
    season: "",
  });
  const [sortBy, setSortBy] = useState("farmName");

  const { t } = useTranslation();

  const fetchFarms = async () => {
    try {
      const farmsRef = collection(db, `users/${currentUser.uid}/farms`);
      const q = query(farmsRef, orderBy(sortBy));
      const querySnapshot = await getDocs(q);

      const farmsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setFarms(farmsData);
    } catch (error) {
      console.error("Error fetching farms:", error);
      setError("Failed to load farms. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, [currentUser.uid, sortBy]);

  const handleDelete = async (farmId) => {
    if (window.confirm("Are you sure you want to delete this farm?")) {
      try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/farms/${farmId}`));
        setFarms(farms.filter((farm) => farm.id !== farmId));
      } catch (error) {
        console.error("Error deleting farm:", error);
        setError("Failed to delete farm. Please try again.");
      }
    }
  };

  const handleEdit = (farm) => {
    setSelectedFarm(farm);
    setOpenEditDialog(true);
  };

  const filteredFarms = farms.filter((farm) => {
    const matchesSearch =
      farm.farmName.toLowerCase().includes(filters.search.toLowerCase()) ||
      farm.village.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory =
      !filters.cropCategory ||
      Object.keys(crops).find((cat) => crops[cat].includes(farm.cropType)) ===
        filters.cropCategory;
    const matchesSeason = !filters.season || farm.season === filters.season;

    return matchesSearch && matchesCategory && matchesSeason;
  });

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

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight="600">
          {t("farmManagement.heading")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAddDialog(true)}
        >
          {t("farmManagement.addFarm")}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FarmFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={() =>
          setFilters({
            search: "",
            cropCategory: "",
            season: "",
          })
        }
      />

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t("farmManagement.storeBy")}</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label={t("farmManagement.storeBy")}
          >
            <MenuItem value="farmName">{t("farmManagement.farmName")}</MenuItem>
            <MenuItem value="createdAt">
              {t("farmManagement.dateAdded")}
            </MenuItem>
            <MenuItem value="totalArea">{t("farmManagement.area")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {filteredFarms.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ textAlign: "center", py: 5 }}>
              <CardContent>
                <Typography color="text.secondary" mb={2}>
                  {farms.length === 0
                    ? `${t("farmManagement.noFarmsAdded")}`
                    : `${t("farmManagement.noFarmsMatch")}`}
                </Typography>
                {farms.length === 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenAddDialog(true)}
                  >
                    {t("farmManagement.addFirstFarm")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ) : (
          filteredFarms.map((farm) => (
            <Grid item xs={12} sm={6} md={4} key={farm.id}>
              <FarmCard
                farm={farm}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Grid>
          ))
        )}
      </Grid>

      <AddFarmDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onFarmAdded={fetchFarms}
      />

      <EditFarmDialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setSelectedFarm(null);
        }}
        farm={selectedFarm}
        onFarmUpdated={fetchFarms}
      />
    </Box>
  );
}
