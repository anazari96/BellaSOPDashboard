"use client";

import { useParams } from "next/navigation";
import SOPForm from "@/components/admin/SOPForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const EditSOPPage = () => {
  const params = useParams();
  const sopId = params.id as string;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Link
        href="/admin/sops"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to SOPs
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit SOP 📝</h1>
        <p className="text-gray-500 text-sm mt-1">
          Update this standard operating procedure
        </p>
      </div>

      <SOPForm sopId={sopId} />
    </div>
  );
};

export default EditSOPPage;
