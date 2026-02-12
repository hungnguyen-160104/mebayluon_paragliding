// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsSection } from "@/components/admin/BookingsSection";
import { CustomersSection } from "@/components/admin/CustomersSection";

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!getToken()) {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
    };
    checkAuth();
  }, [router]);

  if (!ready) {
    return <div className="p-6 text-center">Đang kiểm tra phiên đăng nhập…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-slate-900">Quản Lý Hệ Thống</h1>
      </div>

      {/* Tabs */}
      <div className="backdrop-blur-md bg-white/30 rounded-2xl border border-white/40 shadow-xl p-1">
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/20 rounded-xl">
            <TabsTrigger 
              value="bookings"
              className="data-[state=active]:bg-white/40 data-[state=active]:shadow-md rounded-lg"
            >
              📅 Đơn Đặt Bay
            </TabsTrigger>
            <TabsTrigger 
              value="customers"
              className="data-[state=active]:bg-white/40 data-[state=active]:shadow-md rounded-lg"
            >
              👥 Khách Hàng
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="bookings" className="m-0">
              <BookingsSection />
            </TabsContent>

            <TabsContent value="customers" className="m-0">
              <CustomersSection />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
