import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "./lib/api";
import { Layout } from "./components/Layout";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "sales";
};

type LeadTemperature = "cold" | "warm" | "hot";

type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "visit"
  | "quote"
  | "follow_up"
  | "note";

type Activity = {
  id: string;
  leadId: string;
  type: ActivityType;
  body: string;
  createdAt: string;
  // optional if your backend returns it
  followUpDate?: string | null;
};

type Lead = {
  id: string;
  businessName: string;
  city?: string | null;
  leadTemperature: LeadTemperature;

  // extra fields (optional but useful for detail page)
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  websitePlatform?: string | null;
  opportunity?: string | null;
  websiteHealth?: string | null;
  postcode?: string | null;
  notes?: string | null;
  score?: number;
  createdAt?: string;
  lastContacted?: string | null;
  nextFollowUp?: string | null;
  status?: string;
  doNotContact?: boolean;
  outreachStage?: number;
  outreachStartedAt?: string | null;
  outreachPaused?: boolean;
  nextOutreachDate?: string | null;

  activities?: Activity[];
  deals?: Deal[];
};

type Page =
  | "dashboard"
  | "leads"
  | "follow-up"
  | "campaigns"
  | "import"
  | "settings"
  | "lead";

type DealStage = "proposed" | "won" | "lost";

type ServiceType = "Website" | "SEO" | "Hosting" | "Audit";

type Deal = {
  id: string;
  leadId: string;
  serviceType: ServiceType;
  dealValue: number;
  stage: DealStage;
  closeDate?: string | null;
  createdAt: string;
};

type Campaign = {
  id: string;
  name: string;
  targetCategory?: string | null;
  offerType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  _count?: {
    leadCampaigns: number;
  };
};

function getOutreachStageLabel(stage?: number) {
  if (stage === 1) return "Letter Sent";
  if (stage === 2) return "Recontact Email";
  if (stage === 3) return "Close Loop";
  if (stage === 4) return "Reactivation";
  return "Not Started";
}

export default function App() {
  // auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState("");

  // navigation
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // leads list
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsStatus, setLeadsStatus] = useState("");

  // add lead form
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [creating, setCreating] = useState("");

  // editing in list
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editTemp, setEditTemp] = useState<LeadTemperature>("cold");
  const [saving, setSaving] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [quickNotes, setQuickNotes] = useState<Record<string, string>>({});
  const [savingQuickNoteId, setSavingQuickNoteId] = useState<string | null>(
    null,
  );

  // filters
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<"" | "cold" | "warm" | "hot">(
    "",
  );
  const [sort, setSort] = useState<
    "newest" | "oldest" | "score" | "name" | "urgent"
  >("newest");
  const [statusFilter, setStatusFilter] = useState<
    "" | "active" | "paused" | "dnc"
  >("");

  // lead detail
  const [leadDetail, setLeadDetail] = useState<Lead | null>(null);
  const [leadDetailStatus, setLeadDetailStatus] = useState("");
  const [detailSaving, setDetailSaving] = useState("");

  // detail form fields
  const [dBusinessName, setDBusinessName] = useState("");
  const [dCity, setDCity] = useState("");
  const [dTemp, setDTemp] = useState<LeadTemperature>("cold");
  const [dEmail, setDEmail] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dWebsite, setDWebsite] = useState("");
  const [dPostcode, setDPostcode] = useState("");
  const [dNotes, setDNotes] = useState("");

  // activity form
  const [newActType, setNewActType] = useState<ActivityType>("call");
  const [newActBody, setNewActBody] = useState("");
  const [newActDate, setNewActDate] = useState(""); // only used for follow_up
  const [addingAct, setAddingAct] = useState("");

  const [followUps, setFollowUps] = useState<Lead[]>([]);
  const [followUpsDue, setFollowUpsDue] = useState<Lead[]>([]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState("");

  const [preview, setPreview] = useState<any>(null);

  const [dashboardData, setDashboardData] = useState<{
    totalLeads: number;
    dueToday: number;
    dueNext7: number;
    upcoming: Lead[];
    lettersThisMonth: number;
    emailRecontactsDue: number;
    closeLoopsDue: number;
    reactivationsDue: number;
    pausedLeads: number;
    doNotContactLeads: number;
    pipelineValue: number;
    wonValue: number;
    lostValue: number;
    activeDeals: number;
  } | null>(null);

  const [outreachStageFilter, setOutreachStageFilter] = useState("");
  const [letterSentFilter, setLetterSentFilter] = useState("");
  const [reactivationDueFilter, setReactivationDueFilter] = useState("");

  const [newDealService, setNewDealService] = useState<ServiceType>("Website");
  const [newDealValue, setNewDealValue] = useState("");
  const [newDealStage, setNewDealStage] = useState<DealStage>("proposed");
  const [newDealCloseDate, setNewDealCloseDate] = useState("");
  const [creatingDeal, setCreatingDeal] = useState("");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsStatus, setCampaignsStatus] = useState("");

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignTargetCategory, setNewCampaignTargetCategory] =
    useState("");
  const [newCampaignOfferType, setNewCampaignOfferType] = useState("");
  const [newCampaignStartDate, setNewCampaignStartDate] = useState("");
  const [newCampaignEndDate, setNewCampaignEndDate] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState("");

  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string;
    name: string;
    targetCategory?: string | null;
    offerType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    leadCampaigns: {
      id: string;
      lead: {
        id: string;
        businessName: string;
        city?: string | null;
        status?: string;
        leadTemperature?: LeadTemperature;
      };
    }[];
  } | null>(null);

  const [campaignDetailStatus, setCampaignDetailStatus] = useState("");
  const [campaignLeadId, setCampaignLeadId] = useState("");
  const [assigningLead, setAssigningLead] = useState("");

  // Load saved user on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const refreshLeads = async () => {
    setLeadsStatus("Loading leads...");
    try {
      const params = new URLSearchParams();

      params.set("status", statusFilter || "all");
      if (statusFilter) params.set("status", statusFilter);

      if (search.trim()) params.set("search", search.trim());
      if (tempFilter) params.set("temp", tempFilter);
      if (sort) params.set("sort", sort);

      if (outreachStageFilter) params.set("outreachStage", outreachStageFilter);
      if (letterSentFilter) params.set("letterSent", letterSentFilter);
      if (reactivationDueFilter)
        params.set("reactivationDue", reactivationDueFilter);

      const url = `/leads?${params.toString()}`;
      const data = await apiGet<Lead[]>(url);
      setLeads(data);
      setLeadsStatus("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadsStatus(`❌ ${e.message}`);
      } else {
        setLeadsStatus("❌ Something went wrong");
      }
    }
  };
  const refreshDashboard = async () => {
    try {
      const [upcoming, due] = await Promise.all([
        apiGet<Lead[]>("/leads/followups"),
        apiGet<Lead[]>("/leads/followups/due"),
      ]);

      setFollowUps(upcoming);
      setFollowUpsDue(due);
    } catch {
      // silent
    }
  };

  const refreshDashboardData = async () => {
    try {
      const data = await apiGet<{
        totalLeads: number;
        dueToday: number;
        dueNext7: number;
        upcoming: Lead[];
        lettersThisMonth: number;
        emailRecontactsDue: number;
        closeLoopsDue: number;
        reactivationsDue: number;
        pausedLeads: number;
        doNotContactLeads: number;
        pipelineValue: number;
        wonValue: number;
        lostValue: number;
        activeDeals: number;
      }>("/dashboard");

      setDashboardData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshCampaigns = async () => {
    setCampaignsStatus("Loading campaigns...");
    try {
      const data = await apiGet<Campaign[]>("/campaigns");
      setCampaigns(data);
      setCampaignsStatus("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setCampaignsStatus(`❌ ${e.message}`);
      } else {
        setCampaignsStatus("❌ Something went wrong");
      }
    }
  };

  const dashboardStats = useMemo(() => {
    const total = leads.length;
    const cold = leads.filter((l) => l.leadTemperature === "cold").length;
    const warm = leads.filter((l) => l.leadTemperature === "warm").length;
    const hot = leads.filter((l) => l.leadTemperature === "hot").length;

    const paused = leads.filter((l) => l.status === "paused").length;
    const dnc = leads.filter((l) => l.doNotContact === true).length;

    const now = Date.now();

    const dueFollowUps = leads.filter((l) => {
      if (!l.nextFollowUp) return false;
      const t = new Date(l.nextFollowUp).getTime();
      return !Number.isNaN(t) && t <= now;
    }).length;

    const reactivations = leads.filter((l) => {
      if (!l.nextOutreachDate) return false;
      const t = new Date(l.nextOutreachDate).getTime();
      return l.outreachStage === 3 && !Number.isNaN(t) && t <= now;
    }).length;

    const closeLoops = leads.filter((l) => {
      if (!l.nextOutreachDate) return false;
      const t = new Date(l.nextOutreachDate).getTime();
      return l.outreachStage === 2 && !Number.isNaN(t) && t <= now;
    }).length;

    const emailsDue = leads.filter((l) => {
      if (!l.nextOutreachDate) return false;
      const t = new Date(l.nextOutreachDate).getTime();
      return l.outreachStage === 1 && !Number.isNaN(t) && t <= now;
    }).length;

    const needsAttention =
      dueFollowUps + reactivations + closeLoops + emailsDue;

    return {
      total,
      cold,
      warm,
      hot,
      paused,
      dnc,
      dueFollowUps,
      reactivations,
      closeLoops,
      emailsDue,
      needsAttention,
    };
  }, [leads]);

  // Fetch leads when logged in
  useEffect(() => {
    if (!user) return;
    refreshLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refresh dashboard data when you visit the dashboard
  useEffect(() => {
    if (!user) return;
    if (page !== "dashboard") return;

    refreshDashboard();
    refreshDashboardData();
  }, [user, page]);

  useEffect(() => {
    if (!user) return;
    if (page !== "campaigns") return;
    refreshCampaigns();
    refreshLeads();
  }, [user, page]);

  // Auto refresh when filter/sort changes (debounced)
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => refreshLeads(), 300);
    return () => clearTimeout(t);
  }, [
    search,
    tempFilter,
    statusFilter,
    sort,
    outreachStageFilter,
    letterSentFilter,
    reactivationDueFilter,
    user,
  ]);
  const login = async () => {
    setStatus("Logging in...");
    try {
      const data = await apiPost<{ token: string; user: User }>("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setStatus("");
      setPage("leads");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setStatus(`❌ ${e.message}`);
      } else {
        setStatus("❌ Something went wrong");
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setLeads([]);
    setEditingId(null);
    setSelectedLeadId(null);
    setLeadDetail(null);
    setPage("dashboard");
  };

  const addLead = async () => {
    setCreating("Creating lead...");
    try {
      await apiPost("/leads", {
        businessName: newBusinessName,
        city: newCity || null,
      });

      setNewBusinessName("");
      setNewCity("");
      setCreating("");
      await refreshLeads();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setCreating(`❌ ${e.message}`);
      } else {
        setCreating("❌ Something went wrong");
      }
    }
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditBusinessName(lead.businessName);
    setEditCity(lead.city ?? "");
    setEditTemp(lead.leadTemperature);
    setSaving("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaving("");
  };

  const saveEdit = async (id: string) => {
    setSaving("Saving changes...");
    try {
      await apiPut(`/leads/${id}`, {
        businessName: editBusinessName,
        city: editCity || null,
        leadTemperature: editTemp,
      });

      setSaving("");
      setEditingId(null);
      await refreshLeads();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setSaving(`❌ ${e.message}`);
      } else {
        setSaving("❌ Something went wrong");
      }
    }
  };

  const saveQuickNote = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    setSavingQuickNoteId(id);

    try {
      await apiPut(`/leads/${id}`, {
        businessName: lead.businessName,
        city: lead.city || null,
        leadTemperature: lead.leadTemperature,
        email: lead.email || null,
        phone: lead.phone || null,
        website: lead.website || null,
        postcode: lead.postcode || null,
        notes: quickNotes[id] ?? "",
      });

      setQuickNotes((prev) => ({
        ...prev,
        [id]: quickNotes[id] ?? "",
      }));

      await refreshLeads();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadsStatus(`❌ ${e.message}`);
      } else {
        setLeadsStatus("❌ Something went wrong");
      }
    } finally {
      setSavingQuickNoteId(null);
    }
  };

  const deleteLead = async (id: string) => {
    const ok = confirm("Delete this lead?");
    if (!ok) return;

    setDeleting(id);
    try {
      await apiDelete(`/leads/${id}`);
      setDeleting(null);
      await refreshLeads();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadsStatus(`❌ ${e.message}`);
      } else {
        setLeadsStatus("❌ Something went wrong");
      }
      setDeleting(null);
    }
  };

  const tempStyle = (temp: LeadTemperature) => {
    switch (temp) {
      case "cold":
        return { background: "#e0f2fe", color: "#075985" };
      case "warm":
        return { background: "#fef3c7", color: "#92400e" };
      case "hot":
        return { background: "#fee2e2", color: "#991b1b" };
    }
  };

  // Open detail page
  const openLead = async (id: string) => {
    setSelectedLeadId(id);
    setPage("lead");
    setLeadDetail(null);
    setLeadDetailStatus("Loading lead...");

    try {
      const data = await apiGet<Lead>(`/leads/${id}`);
      setLeadDetail(data);
      setLeadDetailStatus("");

      setDBusinessName(data.businessName ?? "");
      setDCity(data.city ?? "");
      setDTemp(data.leadTemperature ?? "cold");
      setDEmail(data.email ?? "");
      setDPhone(data.phone ?? "");
      setDWebsite(data.website ?? "");
      setDPostcode(data.postcode ?? "");
      setDNotes(data.notes ?? "");

      setNewActType("call");
      setNewActBody("");
      setNewActDate("");
      setAddingAct("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const saveLeadDetail = async () => {
    if (!selectedLeadId) return;

    setDetailSaving("Saving...");
    try {
      const updated = await apiPut<Lead>(`/leads/${selectedLeadId}`, {
        businessName: dBusinessName,
        city: dCity || null,
        leadTemperature: dTemp,
        email: dEmail || null,
        phone: dPhone || null,
        website: dWebsite || null,
        postcode: dPostcode || null,
        notes: dNotes || null,
      });

      setLeadDetail(updated);
      setDetailSaving("");
      await refreshLeads();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setDetailSaving(`❌ ${e.message}`);
      } else {
        setDetailSaving("❌ Something went wrong");
      }
    }
  };

  const addActivity = async () => {
    if (!selectedLeadId) return;
    if (!newActBody.trim()) return;

    if (newActType === "follow_up" && !newActDate) {
      setAddingAct("❌ Please pick a follow-up date/time");
      return;
    }

    setAddingAct("Adding activity...");
    try {
      await apiPost(`/leads/${selectedLeadId}/activities`, {
        type: newActType,
        body: newActBody.trim(),
        followUpDate: newActType === "follow_up" ? newActDate : null,
      });

      setNewActBody("");
      setNewActDate("");
      setAddingAct("");
      await openLead(selectedLeadId);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setAddingAct(`❌ ${e.message}`);
      } else {
        setAddingAct("❌ Something went wrong");
      }
    }
  };

  const createDeal = async () => {
    if (!selectedLeadId) return;

    if (!newDealValue) {
      setCreatingDeal("Please enter deal value");
      return;
    }

    try {
      setCreatingDeal("Creating deal...");

      await apiPost("/deals", {
        leadId: selectedLeadId,
        serviceType: newDealService,
        dealValue: Number(newDealValue),
        stage: newDealStage,
        closeDate: newDealCloseDate || null,
      });

      setNewDealValue("");
      setNewDealCloseDate("");
      setCreatingDeal("");

      await openLead(selectedLeadId); // reload lead
    } catch (e: unknown) {
      if (e instanceof Error) {
        setCreatingDeal(e.message);
      } else {
        setCreatingDeal("Failed to create deal");
      }
    }
  };

  const createCampaign = async () => {
    if (!newCampaignName.trim()) {
      setCreatingCampaign("Campaign name is required");
      return;
    }

    setCreatingCampaign("Creating campaign...");
    try {
      await apiPost("/campaigns", {
        name: newCampaignName.trim(),
        targetCategory: newCampaignTargetCategory || null,
        offerType: newCampaignOfferType || null,
        startDate: newCampaignStartDate || null,
        endDate: newCampaignEndDate || null,
      });

      setNewCampaignName("");
      setNewCampaignTargetCategory("");
      setNewCampaignOfferType("");
      setNewCampaignStartDate("");
      setNewCampaignEndDate("");
      setCreatingCampaign("");

      await refreshCampaigns();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setCreatingCampaign(`❌ ${e.message}`);
      } else {
        setCreatingCampaign("❌ Something went wrong");
      }
    }
  };

  const openCampaign = async (campaignId: string) => {
    setCampaignDetailStatus("Loading campaign...");
    setSelectedCampaign(null);

    try {
      const data = await apiGet<{
        id: string;
        name: string;
        targetCategory?: string | null;
        offerType?: string | null;
        startDate?: string | null;
        endDate?: string | null;
        leadCampaigns: {
          id: string;
          lead: {
            id: string;
            businessName: string;
            city?: string | null;
            status?: string;
            leadTemperature?: LeadTemperature;
          };
        }[];
      }>(`/campaigns/${campaignId}`);

      setSelectedCampaign(data);
      setCampaignDetailStatus("");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setCampaignDetailStatus(`❌ ${e.message}`);
      } else {
        setCampaignDetailStatus("❌ Something went wrong");
      }
    }
  };

  const assignLeadToCampaign = async () => {
    if (!selectedCampaign) return;
    if (!campaignLeadId) {
      setAssigningLead("Please choose a lead");
      return;
    }

    setAssigningLead("Assigning lead...");
    try {
      await apiPost(`/campaigns/${selectedCampaign.id}/leads`, {
        leadIds: [campaignLeadId],
      });

      setCampaignLeadId("");
      setAssigningLead("");

      await openCampaign(selectedCampaign.id);
      await refreshCampaigns();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setAssigningLead(`❌ ${e.message}`);
      } else {
        setAssigningLead("❌ Something went wrong");
      }
    }
  };

  const markLetterSent = async () => {
    if (!selectedLeadId) return;

    setLeadDetailStatus("Marking letter as sent...");

    try {
      await apiPost(`/leads/${selectedLeadId}/mark-letter-sent`, {
        letterTemplate: "intro_v1",
        method: "post",
        trackingRef: `UI-${Date.now()}`,
      });

      await openLead(selectedLeadId);
      await refreshLeads();
      setLeadDetailStatus("✅ Letter marked as sent");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const pauseOutreach = async () => {
    if (!selectedLeadId) return;

    setLeadDetailStatus("Pausing outreach...");

    try {
      await apiPost(`/leads/${selectedLeadId}/pause-outreach`, {});
      await openLead(selectedLeadId);
      await refreshLeads();
      setLeadDetailStatus("✅ Outreach paused");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const markDoNotContact = async () => {
    if (!selectedLeadId) return;

    setLeadDetailStatus("Marking as do not contact...");

    try {
      await apiPost(`/leads/${selectedLeadId}/do-not-contact`, {});
      await openLead(selectedLeadId);
      await refreshLeads();
      setLeadDetailStatus("✅ Lead marked as do not contact");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const resumeOutreach = async () => {
    if (!selectedLeadId) return;

    setLeadDetailStatus("Resuming outreach...");

    try {
      await apiPost(`/leads/${selectedLeadId}/resume-outreach`, {});
      await openLead(selectedLeadId);
      await refreshLeads();
      setLeadDetailStatus("✅ Outreach resumed");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const logCallAttempt = async () => {
    if (!selectedLeadId) return;

    setLeadDetailStatus("Logging call attempt...");

    try {
      await apiPost(`/leads/${selectedLeadId}/log-call`, {});
      await openLead(selectedLeadId);
      await refreshLeads();
      setLeadDetailStatus("✅ Call attempt logged");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const completeFollowUp = async (leadId: string) => {
    try {
      await apiPost(`/leads/${leadId}/complete-followup`, {});
      await refreshDashboard();
      await refreshLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const logRecontactEmail = async () => {
    if (!selectedLeadId) return;

    setLeadDetailStatus("Logging recontact email...");

    try {
      await apiPost(`/leads/${selectedLeadId}/recontact-email`, {});
      await openLead(selectedLeadId);
      await refreshLeads();
      setLeadDetailStatus("✅ Recontact email logged");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLeadDetailStatus(`❌ ${e.message}`);
      } else {
        setLeadDetailStatus("❌ Something went wrong");
      }
    }
  };

  const testImportUpload = async () => {
    if (!importFile) {
      setImportMessage("Please choose a file first");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch(`${API_URL}/import/test`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setImportMessage(
          data.message || "You do not have permission to do this",
        );
        setPreview(null);
        return;
      }

      setImportMessage("");
      setPreview(data);
    } catch (error) {
      console.error(error);
      setImportMessage("Upload failed");
      setPreview(null);
    }
  };

  const title = useMemo(() => {
    if (page === "dashboard") return "Dashboard";
    if (page === "leads") return "Leads";
    if (page === "follow-up") return "Follow-Up";
    if (page === "campaigns") return "Campaigns";
    if (page === "import") return "Import";
    if (page === "settings") return "Settings";
    if (page === "lead") return "Lead Profile";
    return "CRM";
  }, [page]);

  const navigateSidebar = (p: Page) => {
    setPage(p);
    if (p !== "lead") {
      setSelectedLeadId(null);
    }
  };

  const confirmImport = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/import/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rows: preview.rows,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportMessage(data.message || "Import failed");
        return;
      }
      setImportMessage(
        `Imported ${data.imported}, Skipped ${data.skipped} (${data.total} Total)`,
      );
      setPreview(null);

      await refreshLeads();
    } catch (error) {
      console.error(error);
      setImportMessage("Import failed");
    }
  };

  // -------------------------
  // LOGGED OUT VIEW
  // -------------------------
  if (!user) {
    return (
      <div
        style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}
      >
        <h1>CRM Login</h1>

        <label>Email</label>
        <input
          style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          style={{ padding: "10px 14px", cursor: "pointer" }}
        >
          Login
        </button>

        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </div>
    );
  }

  // -------------------------
  // LOGGED IN VIEW (Layout)
  // -------------------------
  return (
    <Layout
      userName={user.name}
      userRole={user.role}
      onLogout={logout}
      page={page === "lead" ? "leads" : page}
      onNavigate={navigateSidebar}
      title={title}
    >
      {/* DASHBOARD */}
      {page === "dashboard" && (
        <div style={{ display: "grid", gap: 24 }}>
          {/* PIPELINE */}
          <div>
            <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Pipeline</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Click a card to open the matching leads.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <DashCard
                title="Cold"
                value={dashboardStats.cold}
                onClick={() => {
                  setTempFilter("cold");
                  setStatusFilter("");
                  setPage("leads");
                }}
              />

              <DashCard
                title="Warm"
                value={dashboardStats.warm}
                onClick={() => {
                  setTempFilter("warm");
                  setStatusFilter("");
                  setPage("leads");
                }}
              />

              <DashCard
                title="Hot"
                value={dashboardStats.hot}
                onClick={() => {
                  setTempFilter("hot");
                  setStatusFilter("");
                  setPage("leads");
                }}
              />

              <DashCard
                title="Paused"
                value={dashboardStats.paused}
                onClick={() => {
                  setTempFilter("");
                  setStatusFilter("paused");
                  setPage("leads");
                }}
              />

              <DashCard
                title="DNC"
                value={dashboardStats.dnc}
                onClick={() => {
                  setTempFilter("");
                  setStatusFilter("dnc");
                  setPage("leads");
                }}
              />
            </div>
          </div>

          {/* WORK QUEUE */}
          <div>
            <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Work queue</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Jump straight into follow-ups and outreach tasks.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <DashCard
                title="Needs Attention"
                value={dashboardStats.needsAttention}
                onClick={() => {
                  setPage("follow-up");
                }}
              />
              <DashCard
                title="Follow-ups due"
                value={dashboardData?.dueToday ?? followUpsDue.length}
                onClick={() => {
                  setPage("follow-up");
                }}
              />
              <DashCard
                title="Overdue follow-ups"
                value={dashboardStats.dueFollowUps}
                onClick={() => {
                  setPage("follow-up");
                }}
              />
              <DashCard
                title="Reactivations"
                value={dashboardData?.reactivationsDue ?? 0}
              />
              <DashCard
                title="Close loops"
                value={dashboardData?.closeLoopsDue ?? 0}
              />
              <DashCard
                title="Emails due"
                value={dashboardData?.emailRecontactsDue ?? 0}
              />
              <DashCard
                title="Letters this month"
                value={dashboardData?.lettersThisMonth ?? 0}
              />
            </div>
          </div>

          {/* DEALS PIPELINE */}
          <div>
            <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                Deals Pipeline
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Track open pipeline and closed revenue.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <DashCard
                title="Active deals"
                value={dashboardData?.activeDeals ?? 0}
              />
              <DashCard
                title="Pipeline £"
                value={dashboardData?.pipelineValue ?? 0}
              />
              <DashCard title="Won £" value={dashboardData?.wonValue ?? 0} />
              <DashCard title="Lost £" value={dashboardData?.lostValue ?? 0} />
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP */}
      {page === "follow-up" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Follow-Up Queue</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            <div style={cardStyle}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Overdue</div>

              {followUpsDue.length === 0 && (
                <div style={{ opacity: 0.7 }}>No overdue follow-ups 🎉</div>
              )}

              {followUpsDue.map((l) => (
                <div
                  key={l.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{l.businessName}</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {l.city || "No city"}
                  </div>

                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Due:{" "}
                    {l.nextFollowUp
                      ? new Date(l.nextFollowUp).toLocaleString()
                      : "—"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    <button onClick={() => openLead(l.id)} style={secondaryBtn}>
                      Open Lead
                    </button>

                    <button
                      onClick={() => completeFollowUp(l.id)}
                      style={primaryBtn}
                    >
                      Complete Follow-Up
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Upcoming</div>

              {followUps.length === 0 && (
                <div style={{ opacity: 0.7 }}>No upcoming follow-ups.</div>
              )}

              {followUps.map((l) => (
                <div
                  key={l.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{l.businessName}</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {l.city || "No city"}
                  </div>

                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    Due:{" "}
                    {l.nextFollowUp
                      ? new Date(l.nextFollowUp).toLocaleString()
                      : "—"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    <button onClick={() => openLead(l.id)} style={secondaryBtn}>
                      Open Lead
                    </button>

                    <button
                      onClick={() => completeFollowUp(l.id)}
                      style={primaryBtn}
                    >
                      Complete Follow-Up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGNS */}
      {page === "campaigns" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
              Create Campaign
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                placeholder="Campaign name"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Target category (optional)"
                value={newCampaignTargetCategory}
                onChange={(e) => setNewCampaignTargetCategory(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="Offer type (optional)"
                value={newCampaignOfferType}
                onChange={(e) => setNewCampaignOfferType(e.target.value)}
                style={inputStyle}
              />

              <input
                type="date"
                value={newCampaignStartDate}
                onChange={(e) => setNewCampaignStartDate(e.target.value)}
                style={inputStyle}
              />

              <input
                type="date"
                value={newCampaignEndDate}
                onChange={(e) => setNewCampaignEndDate(e.target.value)}
                style={inputStyle}
              />

              <button onClick={createCampaign} style={primaryBtn}>
                Create Campaign
              </button>

              {creatingCampaign && <div>{creatingCampaign}</div>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
              Campaign List
            </div>

            {campaignsStatus && <div>{campaignsStatus}</div>}

            {!campaignsStatus && campaigns.length === 0 && (
              <div style={{ opacity: 0.8 }}>No campaigns yet.</div>
            )}

            {campaigns.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => openCampaign(c.id)}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 14,
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {c.name}
                    </div>

                    <div
                      style={{ fontSize: 13, color: "#475569", marginTop: 6 }}
                    >
                      Target: {c.targetCategory || "—"}
                    </div>

                    <div
                      style={{ fontSize: 13, color: "#475569", marginTop: 4 }}
                    >
                      Offer: {c.offerType || "—"}
                    </div>

                    <div
                      style={{ fontSize: 13, color: "#475569", marginTop: 4 }}
                    >
                      Leads: {c._count?.leadCampaigns ?? 0}
                    </div>

                    <div
                      style={{ fontSize: 13, color: "#475569", marginTop: 4 }}
                    >
                      Dates:{" "}
                      {c.startDate
                        ? new Date(c.startDate).toLocaleDateString()
                        : "—"}{" "}
                      to{" "}
                      {c.endDate
                        ? new Date(c.endDate).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
              Campaign Detail
            </div>

            {campaignDetailStatus && <div>{campaignDetailStatus}</div>}

            {!campaignDetailStatus && !selectedCampaign && (
              <div style={{ opacity: 0.8 }}>
                Select a campaign to view and assign leads.
              </div>
            )}

            {selectedCampaign && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>
                    {selectedCampaign.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                    Target: {selectedCampaign.targetCategory || "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                    Offer: {selectedCampaign.offerType || "—"}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#ffffff",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>Assign Lead</div>

                  <select
                    value={campaignLeadId}
                    onChange={(e) => setCampaignLeadId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.businessName}
                        {lead.city ? ` - ${lead.city}` : ""}
                      </option>
                    ))}
                  </select>

                  <button onClick={assignLeadToCampaign} style={primaryBtn}>
                    Assign Lead
                  </button>

                  {assigningLead && <div>{assigningLead}</div>}
                </div>

                <div>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>
                    Assigned Leads
                  </div>

                  {selectedCampaign.leadCampaigns.length === 0 ? (
                    <div style={{ opacity: 0.8 }}>No leads assigned yet.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedCampaign.leadCampaigns.map((row) => (
                        <div
                          key={row.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 12,
                            background: "#ffffff",
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>
                            {row.lead.businessName}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              marginTop: 4,
                            }}
                          >
                            {row.lead.city || "No city"} •{" "}
                            {row.lead.status || "active"} •{" "}
                            {row.lead.leadTemperature || "cold"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMPORT */}
      {page === "import" && (
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Import
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />

            <button onClick={testImportUpload} style={primaryBtn}>
              Upload Test File
            </button>

            {preview && (
              <div style={{ marginTop: 20 }}>
                <h3>Import Preview</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #d1fae5",
                      background: "#f0fdf4",
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#166534",
                      }}
                    >
                      Ready
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: "#166534",
                      }}
                    >
                      {preview.readyCount}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#991b1b",
                      }}
                    >
                      Skipped
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: "#991b1b",
                      }}
                    >
                      {preview.skippedCount}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      Total Rows
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: "#0f172a",
                      }}
                    >
                      {preview.totalRows}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 900,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={tableHeadStyle}>Business</th>
                        <th style={tableHeadStyle}>City</th>
                        <th style={tableHeadStyle}>Email</th>
                        <th style={tableHeadStyle}>Phone</th>
                        <th style={tableHeadStyle}>Website</th>
                        <th style={tableHeadStyle}>Postcode</th>
                        <th style={tableHeadStyle}>Notes</th>
                        <th style={tableHeadStyle}>Status</th>
                        <th style={tableHeadStyle}>Reason</th>
                      </tr>
                    </thead>

                    <tbody>
                      {preview.rows.map((row: any, i: number) => {
                        const isSkipped = row.status === "skipped";

                        return (
                          <tr
                            key={i}
                            style={{
                              background: isSkipped ? "#fef2f2" : "#f0fdf4",
                              borderTop: "1px solid #e5e7eb",
                            }}
                          >
                            <td style={tableCellStyle}>
                              {row.businessName || "-"}
                            </td>
                            <td style={tableCellStyle}>{row.city || "-"}</td>
                            <td style={tableCellStyle}>{row.email || "-"}</td>
                            <td style={tableCellStyle}>{row.phone || "-"}</td>
                            <td style={tableCellStyle}>{row.website || "-"}</td>
                            <td style={tableCellStyle}>
                              {row.postcode || "-"}
                            </td>
                            <td style={tableCellStyle}>{row.notes || "-"}</td>
                            <td style={tableCellStyle}>
                              <span
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  background: isSkipped ? "#fee2e2" : "#dcfce7",
                                  color: isSkipped ? "#991b1b" : "#166534",
                                  textTransform: "capitalize",
                                  display: "inline-block",
                                }}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td style={tableCellStyle}>{row.reason || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {preview.readyCount > 0 && (
                  <button
                    onClick={confirmImport}
                    style={{ ...primaryBtn, marginTop: 16 }}
                  >
                    Import {preview.readyCount} Leads
                  </button>
                )}
              </div>
            )}

            {importMessage && (
              <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>
                {importMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {page === "settings" && (
        <div style={cardStyle}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
            Settings (coming next)
          </div>
          <div style={{ opacity: 0.8 }}>
            Users, roles, password change, etc.
          </div>
        </div>
      )}

      {/* LEADS LIST */}
      {page === "leads" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Add Lead</h3>

            <input
              placeholder="Business name"
              value={newBusinessName}
              onChange={(e) => setNewBusinessName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            />

            <input
              placeholder="City (optional)"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            />

            <button
              onClick={addLead}
              disabled={!newBusinessName}
              style={primaryBtn}
            >
              Add Lead
            </button>

            {creating && <p style={{ marginTop: 10 }}>{creating}</p>}
          </div>

          <div style={{ ...cardStyle, marginBottom: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                alignItems: "center",
              }}
            >
              <input
                placeholder="Search business name or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  ...inputStyle,
                  gridColumn: "span 2",
                }}
              />

              <select
                value={tempFilter}
                onChange={(e) =>
                  setTempFilter(e.target.value as "" | "cold" | "warm" | "hot")
                }
                style={inputStyle}
              >
                <option value="">All temps</option>
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "" | "active" | "paused" | "dnc",
                  )
                }
                style={inputStyle}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="dnc">Do Not Contact</option>
              </select>

              <select
                value={sort}
                onChange={(e) =>
                  setSort(
                    e.target.value as
                      | "newest"
                      | "oldest"
                      | "score"
                      | "name"
                      | "urgent",
                  )
                }
                style={inputStyle}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="score">Highest score</option>
                <option value="name">Name (A-Z)</option>
                <option value="urgent">Urgent first</option>
              </select>

              <select
                value={outreachStageFilter}
                onChange={(e) => setOutreachStageFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="">Outreach stages</option>
                <option value="0">Not started</option>
                <option value="1">Letter sent</option>
                <option value="2">Email sent</option>
                <option value="3">Close loop / reactivation</option>
              </select>

              <select
                value={letterSentFilter}
                onChange={(e) => setLetterSentFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="">Letter sent</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>

              <select
                value={reactivationDueFilter}
                onChange={(e) => setReactivationDueFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="">Reactivation</option>
                <option value="yes">Due now</option>
              </select>

              <button
                onClick={refreshLeads}
                style={{
                  ...primaryBtn,
                  height: 48,
                  width: "100%",
                }}
              >
                Apply
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            {(search ||
              tempFilter ||
              statusFilter ||
              sort !== "newest" ||
              outreachStageFilter ||
              letterSentFilter ||
              reactivationDueFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setTempFilter("");
                  setStatusFilter("");
                  setSort("newest");
                  setOutreachStageFilter("");
                  setLetterSentFilter("");
                  setReactivationDueFilter("");
                }}
                style={secondaryBtn}
              >
                Clear Filters
              </button>
            )}

            {tempFilter && (
              <div style={{ ...secondaryBtn, cursor: "default" }}>
                Temp: {tempFilter}
              </div>
            )}

            {statusFilter && (
              <div style={{ ...secondaryBtn, cursor: "default" }}>
                Status: {statusFilter}
              </div>
            )}

            {search && (
              <div style={{ ...secondaryBtn, cursor: "default" }}>
                Search: {search}
              </div>
            )}
          </div>

          <h2>Leads List</h2>

          {leadsStatus && <p>{leadsStatus}</p>}
          {!leadsStatus && leads.length === 0 && <p>No leads yet.</p>}
          {saving && <p>{saving}</p>}

          {leads.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              {(sort === "urgent"
                ? [...leads].sort((a, b) => {
                    const now = Date.now();

                    const aOverdue =
                      a.nextFollowUp &&
                      new Date(a.nextFollowUp).getTime() < now;
                    const bOverdue =
                      b.nextFollowUp &&
                      new Date(b.nextFollowUp).getTime() < now;

                    if (aOverdue && !bOverdue) return -1;
                    if (!aOverdue && bOverdue) return 1;

                    const aUpcoming = a.nextFollowUp
                      ? new Date(a.nextFollowUp).getTime()
                      : Infinity;
                    const bUpcoming = b.nextFollowUp
                      ? new Date(b.nextFollowUp).getTime()
                      : Infinity;

                    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;

                    return (b.score ?? 0) - (a.score ?? 0);
                  })
                : leads
              ).map((l) => {
                const isEditing = editingId === l.id;

                return (
                  <div
                    key={l.id}
                    style={{
                      ...cardStyle,
                      padding: 16,
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 14px 30px rgba(15, 23, 42, 0.10)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        cardStyle.boxShadow as string;
                    }}
                  >
                    {!isEditing ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <button
                            onClick={() => openLead(l.id)}
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              background: "transparent",
                              border: "none",
                              color: "#0f172a",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                              letterSpacing: "-0.2px",
                            }}
                          >
                            {l.businessName}
                          </button>

                          <div
                            style={{
                              opacity: 0.85,
                              marginTop: 6,
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <span>{l.city ?? "No city"}</span>

                            <span
                              style={{
                                ...tempStyle(l.leadTemperature),
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: "uppercase",
                              }}
                            >
                              {l.leadTemperature}
                            </span>
                          </div>

                          <hr
                            style={{
                              margin: "10px 0",
                              border: "none",
                              borderTop: "1px solid #f1f5f9",
                            }}
                          />

                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 13,
                              color: "#475569",
                              fontWeight: 700,
                            }}
                          >
                            Score: {l.score ?? 0}
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                color: "#475569",
                              }}
                            >
                              Platform: {l.websitePlatform || "Unknown"}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                color: "#334155",
                              }}
                            >
                              Opportunity: {l.opportunity || "—"}
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: "#475569",
                            }}
                          >
                            Status:{" "}
                            {l.status === "dnc"
                              ? "🚫 Do Not Contact"
                              : (l.status ?? "active")}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: "#475569",
                            }}
                          >
                            Health: {l.websiteHealth || "Not scanned"}
                          </div>

                          <div style={{ marginTop: 6 }}>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#475569",
                                marginBottom: 4,
                              }}
                            >
                              Notes:
                            </div>

                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                value={quickNotes[l.id] ?? l.notes ?? ""}
                                onChange={(e) =>
                                  setQuickNotes((prev) => ({
                                    ...prev,
                                    [l.id]: e.target.value,
                                  }))
                                }
                                placeholder="Add note..."
                                style={{
                                  flex: 1,
                                  padding: 8,
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb",
                                  fontSize: 13,
                                }}
                              />

                              <button
                                onClick={() => saveQuickNote(l.id)}
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 8,
                                  border: "1px solid #2563eb",
                                  background: "#2563eb",
                                  color: "#fff",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                {savingQuickNoteId === l.id
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              color: "#475569",
                            }}
                          >
                            <span>
                              Next Follow-Up:{" "}
                              {l.nextFollowUp
                                ? new Date(l.nextFollowUp).toLocaleString()
                                : "—"}
                            </span>

                            {l.nextFollowUp &&
                              new Date(l.nextFollowUp).getTime() <
                                Date.now() && (
                                <span
                                  style={{
                                    background: "#fee2e2",
                                    color: "#b91c1c",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Overdue
                                </span>
                              )}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <button
                            onClick={() => startEdit(l)}
                            style={secondaryBtn}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteLead(l.id)}
                            disabled={deleting === l.id}
                            style={secondaryBtn}
                          >
                            {deleting === l.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        <input
                          value={editBusinessName}
                          onChange={(e) => setEditBusinessName(e.target.value)}
                          style={{ padding: 10, width: "100%" }}
                        />

                        <input
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          placeholder="City"
                          style={{ padding: 10, width: "100%" }}
                        />

                        <select
                          value={editTemp}
                          onChange={(e) =>
                            setEditTemp(e.target.value as LeadTemperature)
                          }
                          style={{ padding: 10, width: "100%" }}
                        >
                          <option value="cold">cold</option>
                          <option value="warm">warm</option>
                          <option value="hot">hot</option>
                        </select>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => saveEdit(l.id)}
                            disabled={!editBusinessName}
                            style={{ padding: "10px 12px", cursor: "pointer" }}
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEdit}
                            style={{ padding: "10px 12px", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LEAD DETAIL PAGE */}
      {page === "lead" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => {
                setPage("leads");
                setSelectedLeadId(null);
                setLeadDetail(null);
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderRadius: 10,
                border: "1px solid #1f2937",
                background: "#f8fafc",
                color: "#1f2937",
                fontWeight: 700,
              }}
            >
              ← Back to Leads
            </button>
          </div>

          <div
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 16,
              background: "#ffffff",
              padding: 18,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>Outreach Panel</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  Stage
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#e0f2fe",
                    color: "#075985",
                    width: "fit-content",
                  }}
                >
                  {getOutreachStageLabel(leadDetail?.outreachStage)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  Started
                </div>
                <div style={{ fontWeight: 800 }}>
                  {leadDetail?.outreachStartedAt
                    ? new Date(
                        leadDetail.outreachStartedAt,
                      ).toLocaleDateString()
                    : "—"}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  Next Outreach
                </div>
                <div style={{ fontWeight: 800 }}>
                  {leadDetail?.nextOutreachDate
                    ? new Date(leadDetail.nextOutreachDate).toLocaleDateString()
                    : "—"}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  Paused
                </div>
                <div style={{ fontWeight: 800 }}>
                  {leadDetail?.outreachPaused ? "Yes" : "No"}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  Do Not Contact
                </div>
                <div style={{ fontWeight: 800 }}>
                  {leadDetail?.doNotContact ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {leadDetail?.outreachStage === 0 && (
                <button
                  onClick={markLetterSent}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #1f2937",
                    background: "#f8fafc",
                    color: "#1f2937",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Mark Letter Sent
                </button>
              )}

              <button
                onClick={pauseOutreach}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  background: "#f8fafc",
                  color: "#1f2937",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Pause Outreach
              </button>

              {leadDetail?.outreachPaused && (
                <button
                  onClick={resumeOutreach}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #1f2937",
                    background: "#f8fafc",
                    color: "#1f2937",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Resume Outreach
                </button>
              )}

              <button
                onClick={markDoNotContact}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #7f1d1d",
                  background: "#fff7f7",
                  color: "#7f1d1d",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Mark Do Not Contact
              </button>

              {leadDetail?.outreachStage === 1 && (
                <button
                  onClick={logRecontactEmail}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #1f2937",
                    background: "#f8fafc",
                    color: "#1f2937",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Log Recontact Email
                </button>
              )}

              {leadDetail?.outreachStage === 2 && (
                <button
                  onClick={logCallAttempt}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #1f2937",
                    background: "#f8fafc",
                    color: "#1f2937",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Log Call Attempt
                </button>
              )}
            </div>
          </div>

          {leadDetailStatus && (
            <div style={{ opacity: 0.9 }}>{leadDetailStatus}</div>
          )}
          {!leadDetailStatus && !leadDetail && (
            <div style={{ opacity: 0.9 }}>No lead selected.</div>
          )}

          {leadDetail && (
            <div
              style={{
                border: "1px solid #222",
                borderRadius: 14,
                padding: 16,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>
                    {leadDetail.businessName}
                  </div>
                  <div style={{ opacity: 0.8, marginTop: 4 }}>
                    Lead ID: {leadDetail.id}
                  </div>
                </div>

                <span
                  style={{
                    ...tempStyle(dTemp),
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    height: "fit-content",
                  }}
                >
                  {dTemp}
                </span>
              </div>

              <hr style={{ margin: "16px 0", borderColor: "#1f1f25" }} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field label="Business Name">
                  <input
                    value={dBusinessName}
                    onChange={(e) => setDBusinessName(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="City">
                  <input
                    value={dCity}
                    onChange={(e) => setDCity(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Temperature">
                  <select
                    value={dTemp}
                    onChange={(e) =>
                      setDTemp(e.target.value as LeadTemperature)
                    }
                    style={inputStyle}
                  >
                    <option value="cold">cold</option>
                    <option value="warm">warm</option>
                    <option value="hot">hot</option>
                  </select>
                </Field>

                <Field label="Postcode">
                  <input
                    value={dPostcode}
                    onChange={(e) => setDPostcode(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Email">
                  <input
                    value={dEmail}
                    onChange={(e) => setDEmail(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Phone">
                  <input
                    value={dPhone}
                    onChange={(e) => setDPhone(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Website">
                  <input
                    value={dWebsite}
                    onChange={(e) => setDWebsite(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Platform">
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "#f8fafc",
                      color: "#0f172a",
                    }}
                  >
                    {leadDetail?.websitePlatform || "Unknown"}
                  </div>
                </Field>

                <Field label="Notes">
                  <textarea
                    value={dNotes}
                    onChange={(e) => setDNotes(e.target.value)}
                    style={{
                      ...inputStyle,
                      minHeight: 110,
                      resize: "vertical",
                    }}
                  />
                </Field>
              </div>

              <Field label="Opportunity">
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                    color: "#0f172a",
                  }}
                >
                  {leadDetail?.opportunity || "—"}
                </div>
              </Field>

              <Field label="Website Health">
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                    color: "#0f172a",
                  }}
                >
                  {leadDetail?.websiteHealth || "Not scanned"}
                </div>
              </Field>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                  alignItems: "center",
                }}
              >
                <button
                  onClick={saveLeadDetail}
                  disabled={!dBusinessName}
                  style={primaryBtn}
                >
                  Save changes
                </button>
                {detailSaving && (
                  <div style={{ opacity: 0.9 }}>{detailSaving}</div>
                )}
              </div>

              <hr style={{ margin: "18px 0", borderColor: "#1f1f25" }} />

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  Activity Timeline
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    Add Activity
                  </div>

                  <select
                    value={newActType}
                    onChange={(e) =>
                      setNewActType(e.target.value as ActivityType)
                    }
                    style={inputStyle}
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="visit">Visit</option>
                    <option value="quote">Quote</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="note">Note</option>
                  </select>

                  {newActType === "follow_up" && (
                    <input
                      type="datetime-local"
                      value={newActDate}
                      onChange={(e) => setNewActDate(e.target.value)}
                      style={inputStyle}
                    />
                  )}

                  <textarea
                    value={newActBody}
                    onChange={(e) => setNewActBody(e.target.value)}
                    placeholder="What happened? e.g. Called owner, no answer. Left voicemail."
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                  />

                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <button
                      onClick={addActivity}
                      disabled={!newActBody.trim()}
                      style={primaryBtn}
                    >
                      Add activity
                    </button>
                    {addingAct && (
                      <div style={{ opacity: 0.9 }}>{addingAct}</div>
                    )}
                  </div>
                </div>

                {leadDetail.activities && leadDetail.activities.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {leadDetail.activities.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 14,
                          padding: 16,
                          background: "#ffffff",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              textTransform: "uppercase",
                              fontSize: 12,
                              color: "#475569",
                            }}
                          >
                            {a.type.replace("_", " ")}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {new Date(a.createdAt).toLocaleString()}
                          </div>
                        </div>

                        {a.followUpDate && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "#475569",
                            }}
                          >
                            Follow-up due:{" "}
                            <strong>
                              {new Date(a.followUpDate).toLocaleString()}
                            </strong>
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 8,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.4,
                            color: "#0f172a",
                          }}
                        >
                          {a.body}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.8 }}>
                    No activity yet — add the first log above.
                  </div>
                )}

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 16,
                    background: "#ffffff",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>Create Deal</div>

                  <select
                    value={newDealService}
                    onChange={(e) =>
                      setNewDealService(e.target.value as ServiceType)
                    }
                    style={inputStyle}
                  >
                    <option value="Website">Website</option>
                    <option value="SEO">SEO</option>
                    <option value="Hosting">Hosting</option>
                    <option value="Audit">Audit</option>
                  </select>

                  <input
                    placeholder="Deal value (£)"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                    style={inputStyle}
                  />

                  <select
                    value={newDealStage}
                    onChange={(e) =>
                      setNewDealStage(e.target.value as DealStage)
                    }
                    style={inputStyle}
                  >
                    <option value="proposed">Proposed</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>

                  <input
                    type="date"
                    value={newDealCloseDate}
                    onChange={(e) => setNewDealCloseDate(e.target.value)}
                    style={inputStyle}
                  />

                  <button onClick={createDeal} style={primaryBtn}>
                    Create Deal
                  </button>

                  {creatingDeal && (
                    <div style={{ opacity: 0.8 }}>{creatingDeal}</div>
                  )}
                </div>
              </div>

              <hr style={{ margin: "20px 0" }} />

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Deals</div>

                {leadDetail?.deals && leadDetail.deals.length > 0 ? (
                  leadDetail.deals.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        padding: 14,
                        background: "#ffffff",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{d.serviceType}</div>

                      <div style={{ fontSize: 14, marginTop: 4 }}>
                        Value: £{Number(d.dealValue).toLocaleString()}
                      </div>

                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Stage: {d.stage}
                      </div>

                      {d.closeDate && (
                        <div style={{ fontSize: 13 }}>
                          Close Date:{" "}
                          {new Date(d.closeDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ opacity: 0.7 }}>No deals yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{label}</div>
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #c7d2fe",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 700,
};

const tableHeadStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tableCellStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#0f172a",
  verticalAlign: "top",
};

function DashCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number;
  onClick?: () => void;
}) {
  const isUrgent =
    value > 0 &&
    (title === "Follow-ups due" ||
      title === "Reactivations" ||
      title === "Close loops" ||
      title === "Emails due");

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.10)";
        e.currentTarget.style.borderColor = isUrgent ? "#fca5a5" : "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow)";
        e.currentTarget.style.borderColor = isUrgent
          ? "#fecaca"
          : "var(--border)";
      }}
      style={{
        background: "var(--panel)",
        border: isUrgent ? "1px solid #fecaca" : "1px solid var(--border)",
        borderRadius: 16,
        padding: 16,
        minHeight: 96,
        display: "grid",
        gap: 8,
        boxShadow: "var(--shadow)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.18s ease",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: isUrgent ? "#b91c1c" : "var(--muted)",
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1,
          color: isUrgent ? "#b91c1c" : value > 0 ? "#0f172a" : "#cbd5e1",
        }}
      >
        {title.includes("£") ? `£${Number(value).toLocaleString()}` : value}
      </div>
    </div>
  );
}
