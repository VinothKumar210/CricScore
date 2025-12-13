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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const queryClient = useQueryClient();
const { toast } = useToast();

const addMatchMutation = useMutation({
  mutationFn: async (data: MatchFormData) => {
    const response = await apiRequest('POST', '/api/matches', data);
    return response.json();
  },
  onSuccess: () => {
    toast({ title: "Success", description: "Match saved!" });
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
  },
  onError: (error: any) => {
    toast({ title: "Error", description: error.message || "Failed to save match", variant: "destructive" });
  },
});

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

<Form {...form}>
  <FormField
    control={form.control}
    name="opponent"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Opponent Team</FormLabel>
        <FormControl>
          <Input {...field} placeholder="Enter opponent" />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  <FormField
    control={form.control}
    name="matchDate"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Match Date</FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>

import { Switch } from "@/components/ui/switch";

<FormField
  control={form.control}
  name="runsScored"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Runs Scored</FormLabel>
      <FormControl>
        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="wasDismissed"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Were you dismissed?</FormLabel>
      <FormControl>
        <Switch checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
<FormField control={form.control} name="oversBowled" render={({ field }) => (
  <FormItem>
    <FormLabel>Overs Bowled</FormLabel>
    <FormControl>
      <Input type="number" step="0.1" {...field} />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />
<FormField control={form.control} name="runsConceded" render={({ field }) => (
  <FormItem>
    <FormLabel>Runs Conceded</FormLabel>
    <FormControl>
      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />
<FormField control={form.control} name="wicketsTaken" render={({ field }) => (
  <FormItem>
    <FormLabel>Wickets Taken</FormLabel>
    <FormControl>
      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
    </FormControl>
    <FormMessage />
  </FormItem>
)} />

import { Button } from "@/components/ui/button";

<div className="flex space-x-4">
  <Button type="button" onClick={() => form.reset()}>Reset Form</Button>
  <Button type="submit" disabled={addMatchMutation.isPending}>
    {addMatchMutation.isPending ? "Saving..." : "Save Match Statistics"}
  </Button>
</div>
