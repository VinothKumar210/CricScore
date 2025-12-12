import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { matchFormSchema } from "@shared/schema";
import { z } from "zod";

type MatchFormData = z.infer<typeof matchFormSchema>;

export default function AddMatch() {
  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema),
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Add Match Statistics</h2>
      <form>
        {/* Form will go here */}
      </form>
    </div>
  );
}
