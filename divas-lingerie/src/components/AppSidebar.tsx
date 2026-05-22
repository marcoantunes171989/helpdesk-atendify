import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { COMPANY_NAME } from "@/lib/constants";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  HandCoins,
  Sparkles,
  Tag,
  Calculator,
  UserCheck,
  BarChart3,
  Truck,
  MapPin,
  ShieldCheck,
  UserCog,
  Ruler,
  Palette,
  LogOut,
  WalletCards,
  Settings
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const menuGroups = [
  {
    label: "Operacional",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Vendas", url: "/vendas", icon: ShoppingBag },
      { title: "Visitas", url: "/visitas", icon: MapPin },
    ]
  },
  {
    label: "Gestão Comercial",
    items: [
      { title: "Consignação", url: "/sacoleira", icon: HandCoins },
      { title: "Comissão", url: "/comissao", icon: Calculator },
      { title: "CRM", url: "/crm", icon: UserCheck },
    ]
  },
  {
    label: "Cadastros & Estoque",
    items: [
      { title: "Produtos", url: "/produtos", icon: Package },
      { title: "Categorias", url: "/categorias", icon: Tag },
      { title: "Tamanhos", url: "/tamanhos", icon: Ruler },
      { title: "Cores", url: "/cores", icon: Palette },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Fornecedor", url: "/fornecedor", icon: Truck },
      { title: "Finalizadoras", url: "/finalizadoras", icon: WalletCards },
    ]
  },
  {
    label: "Sistema & Análise",
    items: [
      { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
      { title: "Auditoria", url: "/auditoria", icon: ShieldCheck },
      { title: "Usuários", url: "/usuarios", icon: UserCog },
      { title: "Cargos", url: "/cargos", icon: ShieldCheck },
      { title: "Painel Admin", url: "/admin", icon: Settings },
    ]
  }
];

export function AppSidebar() {
  const { setOpenMobile, isMobile } = useSidebar();
  const { signOut } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });
  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);
 
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    setShowLogoutDialog(false);
    await signOut();
    window.location.replace("/");
  };

  const classes = {
    title: "text-base font-semibold",
    icon: "h-6 w-6",
    button: "py-4 px-4",
    groupLabel: "text-[0.8rem] mb-2 mt-4",
    menuGap: "gap-1.5"
  };

  return (
    <Sidebar collapsible="icon" side={isMobile ? "right" : "left"}>
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-6">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-soft)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="text-base font-bold leading-tight truncate">{COMPANY_NAME}</span>
            <span className="text-xs text-muted-foreground mt-0.5">Controle de vendas</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-2 py-4">
            {menuGroups.map((group) => (
              <SidebarGroup key={group.label} className="p-0">
                <SidebarGroupLabel className={`${classes.groupLabel} px-4 uppercase tracking-wider font-extrabold text-sidebar-foreground/50`}>
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className={classes.menuGap}>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive(item.url)} 
                          tooltip={item.title} 
                          className={`${classes.button} h-auto rounded-xl transition-all duration-200 hover:bg-sidebar-accent/50`}
                        >
                          <Link to={item.url} onClick={handleLinkClick} className="flex items-center gap-4">
                            <item.icon className={`${classes.icon} shrink-0 transition-transform duration-200 group-hover:scale-110`} />
                            <span className={`${classes.title} truncate`}>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar/30 backdrop-blur-sm">
        <SidebarMenu className="gap-4">

          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => setShowLogoutDialog(true)}
              className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${classes.button} h-auto rounded-xl transition-colors`}
              tooltip="Sair do sistema"
            >
              <LogOut className={`${classes.icon} shrink-0`} />
              <span className={classes.title}>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <LogOut className="h-6 w-6 text-destructive" /> Confirmar Saída
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground pt-2">
                Deseja realmente sair do sistema? Sua sessão será encerrada.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button 
                variant="outline" 
                className="w-full sm:flex-1 h-12 rounded-2xl font-bold border-slate-200" 
                onClick={() => setShowLogoutDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                className="w-full sm:flex-1 h-12 rounded-2xl font-bold bg-destructive hover:bg-destructive/90" 
                onClick={handleSignOut}
              >
                Sair
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}