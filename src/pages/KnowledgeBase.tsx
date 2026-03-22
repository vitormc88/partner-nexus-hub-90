import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCategories,
  useDocuments,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
} from "@/hooks/useKnowledgeBase";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen, FileText, Code, Shield, Image, Rocket, Monitor, HelpCircle, Briefcase, FolderOpen,
  Plus, Search, Pencil, Trash2, ExternalLink, Download, Upload, Link, File, Globe, Lock, Users,
  MoreVertical, Files,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, FileText, Code, Shield, Image, Rocket, Monitor, HelpCircle, Briefcase, FolderOpen,
};

function getIcon(name?: string | null) {
  if (!name) return FolderOpen;
  return ICON_MAP[name] || FolderOpen;
}

const VISIBILITY_OPTIONS = [
  { value: "global", label: "All Partners + HQ", icon: Globe },
  { value: "hq_only", label: "HQ Only", icon: Lock },
  { value: "partner_specific", label: "Specific Partner", icon: Users },
];

/** Build hierarchical category options with indentation */
function buildCategoryOptions(categories: any[]) {
  const topCats = categories.filter((c) => !c.parent_category_id);
  const result: { id: string; label: string; depth: number }[] = [];
  for (const cat of topCats) {
    result.push({ id: cat.id, label: cat.name, depth: 0 });
    const subs = categories.filter((c) => c.parent_category_id === cat.id);
    for (const sub of subs) {
      result.push({ id: sub.id, label: `↳ ${sub.name}`, depth: 1 });
    }
  }
  return result;
}

export default function KnowledgeBase() {
  const { isAdmin, isHQ } = useAuth();
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { data: documents = [], isLoading: docLoading } = useDocuments(selectedCategoryId);
  const [search, setSearch] = useState("");
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  const topCategories = categories.filter((c: any) => !c.parent_category_id);
  const getSubcategories = (parentId: string) => categories.filter((c: any) => c.parent_category_id === parentId);

  const filteredDocs = documents.filter((d: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(s) ||
      d.description?.toLowerCase().includes(s) ||
      d.tags?.some((t: string) => t.toLowerCase().includes(s))
    );
  });

  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">Documentation, guides, and resources for the partner ecosystem</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditingCat(null); setShowCatDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Category
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)}>
              <Files className="h-4 w-4 mr-1" /> Bulk Upload
            </Button>
            <Button size="sm" onClick={() => { setEditingDoc(null); setShowDocDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Resource
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: Category tree */}
        <div className="w-64 shrink-0 space-y-1">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              !selectedCategoryId ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="h-4 w-4" /> All Resources
          </button>
          {catLoading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">Loading…</div>
          ) : (
            topCategories.map((cat: any) => {
              const Icon = getIcon(cat.icon);
              const subs = getSubcategories(cat.id);
              return (
                <div key={cat.id}>
                  <CategoryTreeItem
                    cat={cat}
                    Icon={Icon}
                    isSelected={selectedCategoryId === cat.id}
                    isAdmin={isAdmin}
                    onSelect={() => setSelectedCategoryId(cat.id)}
                    onEdit={() => { setEditingCat(cat); setShowCatDialog(true); }}
                    onDelete={() => handleDeleteCategory(cat)}
                    depth={0}
                  />
                  {subs.map((sub: any) => {
                    const SubIcon = getIcon(sub.icon);
                    return (
                      <CategoryTreeItem
                        key={sub.id}
                        cat={sub}
                        Icon={SubIcon}
                        isSelected={selectedCategoryId === sub.id}
                        isAdmin={isAdmin}
                        onSelect={() => setSelectedCategoryId(sub.id)}
                        onEdit={() => { setEditingCat(sub); setShowCatDialog(true); }}
                        onDelete={() => handleDeleteCategory(sub)}
                        depth={1}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Right: Resource list */}
        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resources by title, description, or tag…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {selectedCategory && (
            <div className="flex items-center gap-2">
              {(() => { const I = getIcon(selectedCategory.icon); return <I className="h-5 w-5 text-primary" />; })()}
              <h2 className="text-lg font-semibold">{selectedCategory.name}</h2>
              {selectedCategory.description && <span className="text-sm text-muted-foreground">— {selectedCategory.description}</span>}
            </div>
          )}

          {docLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading resources…</div>
          ) : filteredDocs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No resources available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin ? "Click '+ Resource' to add the first document." : "Resources will appear here once published by HQ."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredDocs.map((doc: any) => (
                <ResourceCard
                  key={doc.id}
                  doc={doc}
                  isAdmin={isAdmin}
                  onEdit={() => { setEditingDoc(doc); setShowDocDialog(true); }}
                  onArchive={() => {
                    deleteDocument.mutate(doc.id, {
                      onSuccess: () => toast({ title: "Resource archived" }),
                      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CategoryDialog
        open={showCatDialog}
        onOpenChange={setShowCatDialog}
        editing={editingCat}
        categories={categories}
        onCreate={(v: any) => createCategory.mutate(v, {
          onSuccess: () => { setShowCatDialog(false); toast({ title: "Category created" }); },
          onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })}
        onUpdate={(v: any) => updateCategory.mutate(v, {
          onSuccess: () => { setShowCatDialog(false); toast({ title: "Category updated" }); },
          onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })}
        saving={createCategory.isPending || updateCategory.isPending}
      />

      <DocumentDialog
        open={showDocDialog}
        onOpenChange={setShowDocDialog}
        editing={editingDoc}
        categories={categories}
        onCreate={(v: any) => createDocument.mutate(v, {
          onSuccess: () => { setShowDocDialog(false); toast({ title: "Resource created" }); },
          onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })}
        onUpdate={(v: any) => updateDocument.mutate(v, {
          onSuccess: () => { setShowDocDialog(false); toast({ title: "Resource updated" }); },
          onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        })}
        saving={createDocument.isPending || updateDocument.isPending}
      />

      <BulkUploadDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        categories={categories}
        onComplete={() => { setShowBulkDialog(false); }}
      />
    </div>
  );

  function handleDeleteCategory(cat: any) {
    if (confirm(`Delete "${cat.name}"? Documents inside will lose their category.`)) {
      deleteCategory.mutate(cat.id, {
        onSuccess: () => {
          toast({ title: "Category deleted" });
          if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  }
}

/* ── Category Tree Item ── */
function CategoryTreeItem({ cat, Icon, isSelected, isAdmin, onSelect, onEdit, onDelete, depth }: {
  cat: any; Icon: React.ElementType; isSelected: boolean; isAdmin: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void; depth: number;
}) {
  return (
    <div className="flex items-center group">
      <button
        onClick={onSelect}
        className={`flex-1 flex items-center gap-2 rounded-md text-sm transition-colors ${
          depth === 0 ? "px-3 py-2" : "pl-8 pr-3 py-1.5"
        } ${isSelected ? "bg-accent text-accent-foreground font-medium" : depth === 0 ? "text-foreground hover:bg-muted" : "text-muted-foreground hover:bg-muted"}`}
      >
        <Icon className={`shrink-0 ${depth === 0 ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
        <span className="truncate">{cat.name}</span>
      </button>
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity">
              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/* ── Resource Card ── */
function ResourceCard({ doc, isAdmin, onEdit, onArchive }: { doc: any; isAdmin: boolean; onEdit: () => void; onArchive: () => void }) {
  const isExternalLink = doc.file_type === "link";
  const catName = doc.document_categories?.name;

  const handleOpen = () => {
    if (!doc.file_url) {
      toast({ title: "No file or link available", variant: "destructive" });
      return;
    }
    window.open(doc.file_url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4 flex items-start gap-4">
        <button onClick={handleOpen} className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors">
          {isExternalLink ? <Link className="h-5 w-5 text-primary" /> : <File className="h-5 w-5 text-primary" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button onClick={handleOpen} className="font-medium text-sm truncate hover:underline text-left block">{doc.title}</button>
              {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpen} title={isExternalLink ? "Open link" : "Download file"}>
                {isExternalLink ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              </Button>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={onArchive}><Trash2 className="h-3.5 w-3.5 mr-2" /> Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {catName && <Badge variant="secondary" className="text-[11px]">{catName}</Badge>}
            {doc.file_type && doc.file_type !== "link" && <Badge variant="outline" className="text-[11px] uppercase">{doc.file_type}</Badge>}
            {doc.file_type === "link" && <Badge variant="outline" className="text-[11px]">🔗 Link</Badge>}
            {doc.visibility_scope === "hq_only" && <Badge variant="destructive" className="text-[11px]"><Lock className="h-3 w-3 mr-1" />HQ Only</Badge>}
            {doc.visibility_scope === "partner_specific" && <Badge className="text-[11px]"><Users className="h-3 w-3 mr-1" />Partner</Badge>}
            {doc.tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Category Dialog ── */
function CategoryDialog({ open, onOpenChange, editing, categories, onCreate, onUpdate, saving }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("FolderOpen");
  const [parentId, setParentId] = useState<string | null>(null);
  const isEdit = !!editing;

  const handleOpen = (o: boolean) => {
    if (o && editing) {
      setName(editing.name || ""); setDescription(editing.description || ""); setIcon(editing.icon || "FolderOpen"); setParentId(editing.parent_category_id || null);
    } else if (o) {
      setName(""); setDescription(""); setIcon("FolderOpen"); setParentId(null);
    }
    onOpenChange(o);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (isEdit) {
      onUpdate({ id: editing.id, name, description, icon, parent_category_id: parentId });
    } else {
      onCreate({ name, description, icon, parent_category_id: parentId, sort_order: categories.length + 1 });
    }
  };

  // Only top-level categories as parent options (exclude self)
  const parentOptions = categories.filter((c: any) => !c.parent_category_id && c.id !== editing?.id);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>Organize your knowledge base with categories and subcategories.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Materials" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description…" rows={2} /></div>
          <div>
            <Label>Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(ICON_MAP).map((i) => {
                  const I = ICON_MAP[i];
                  return <SelectItem key={i} value={i}><span className="flex items-center gap-2"><I className="h-4 w-4" />{i}</span></SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Parent Category</Label>
            <Select value={parentId || "_none"} onValueChange={(v) => setParentId(v === "_none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="None (top level)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None (top level)</SelectItem>
                {parentOptions.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>{saving ? "Saving…" : isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Document Dialog ── */
function DocumentDialog({ open, onOpenChange, editing, categories, onCreate, onUpdate, saving }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("link");
  const [visibility, setVisibility] = useState("global");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const isEdit = !!editing;

  const categoryOptions = buildCategoryOptions(categories);

  const handleOpen = (o: boolean) => {
    if (o && editing) {
      setTitle(editing.title || ""); setDescription(editing.description || ""); setCategoryId(editing.category_id || "");
      setFileUrl(editing.file_url || ""); setFileType(editing.file_type === "link" ? "link" : (editing.file_type || "file"));
      setVisibility(editing.visibility_scope || "global"); setTags(editing.tags?.join(", ") || "");
      setFileName(editing.file_name || "");
    } else if (o) {
      setTitle(""); setDescription(""); setCategoryId(""); setFileUrl(""); setFileType("link"); setVisibility("global"); setTags(""); setFileName("");
    }
    onOpenChange(o);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "file";
    const path = `kb/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    setFileUrl(urlData.publicUrl);
    setFileType(ext);
    setFileName(file.name);
    setUploading(false);
    toast({ title: "File uploaded successfully" });
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (fileType === "link" && fileUrl && !fileUrl.startsWith("http")) {
      toast({ title: "Invalid URL", description: "URL must start with http:// or https://", variant: "destructive" }); return;
    }
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload: any = {
      title, description, category_id: categoryId || null,
      file_url: fileUrl, file_type: fileType, file_name: fileName,
      visibility_scope: visibility, tags: parsedTags,
    };
    if (isEdit) {
      onUpdate({ id: editing.id, ...payload });
    } else {
      onCreate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Resource" : "Add Resource"}</DialogTitle>
          <DialogDescription>Add documentation, links, or files to the knowledge base.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description…" rows={2} /></div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId || "_none"} onValueChange={(v) => setCategoryId(v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Uncategorized</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className={c.depth === 1 ? "pl-2 text-muted-foreground" : ""}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Resource Type</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant={fileType === "link" ? "default" : "outline"} size="sm" onClick={() => { setFileType("link"); setFileUrl(""); setFileName(""); }}>
                <Link className="h-4 w-4 mr-1" /> External Link
              </Button>
              <Button type="button" variant={fileType !== "link" ? "default" : "outline"} size="sm" onClick={() => { setFileType("file"); setFileUrl(""); setFileName(""); }}>
                <Upload className="h-4 w-4 mr-1" /> Upload File
              </Button>
            </div>
          </div>
          {fileType === "link" ? (
            <div><Label>URL</Label><Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…" /></div>
          ) : (
            <div>
              <Label>File</Label>
              <Input type="file" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
              {fileUrl && !uploading && <p className="text-xs text-green-600 mt-1 truncate">✓ {fileName || fileUrl.split("/").pop()}</p>}
            </div>
          )}
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tags</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma-separated tags" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || uploading || !title.trim()}>{saving ? "Saving…" : isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Bulk Upload Dialog ── */
function BulkUploadDialog({ open, onOpenChange, categories, onComplete }: {
  open: boolean; onOpenChange: (o: boolean) => void; categories: any[]; onComplete: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState("global");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createDocument = useCreateDocument();

  const categoryOptions = buildCategoryOptions(categories);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "file";
      const path = `kb/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) {
        failCount++;
        setProgress(((i + 1) / files.length) * 100);
        continue;
      }
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

      try {
        await new Promise<void>((resolve, reject) => {
          createDocument.mutate({
            title,
            file_url: urlData.publicUrl,
            file_type: ext,
            file_name: file.name,
            file_size_bytes: file.size,
            category_id: categoryId || undefined,
            visibility_scope: visibility,
          }, {
            onSuccess: () => { successCount++; resolve(); },
            onError: (e) => { failCount++; resolve(); },
          });
        });
      } catch {
        failCount++;
      }
      setProgress(((i + 1) / files.length) * 100);
    }

    setUploading(false);
    setFiles([]);
    setProgress(0);
    toast({
      title: "Bulk upload complete",
      description: `${successCount} uploaded${failCount > 0 ? `, ${failCount} failed` : ""}`,
      variant: failCount > 0 ? "destructive" : undefined,
    });
    onComplete();
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) { setFiles([]); setProgress(0); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Files</DialogTitle>
          <DialogDescription>Upload multiple files at once. Each file will create a separate resource entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Files</Label>
            <Input ref={fileInputRef} type="file" multiple onChange={handleFilesSelected} disabled={uploading} className="mt-1" />
          </div>

          {files.length > 0 && (
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{f.name} <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span></span>
                  {!uploading && (
                    <button onClick={() => removeFile(i)} className="text-destructive hover:underline text-xs ml-2">Remove</button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">{files.length} file(s) selected</p>
            </div>
          )}

          <div>
            <Label>Category (applied to all)</Label>
            <Select value={categoryId || "_none"} onValueChange={(v) => setCategoryId(v === "_none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Uncategorized</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className={c.depth === 1 ? "pl-2 text-muted-foreground" : ""}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Visibility (applied to all)</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}% complete</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? "Uploading…" : `Upload ${files.length} File${files.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
