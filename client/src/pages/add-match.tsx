import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { matchFormSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

type MatchFormData = z.infer<typeof matchFormSchema>;

export default function AddMatch() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MatchFormData>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      opponent: "",
      matchDate: new Date().toISOString().split('T')[0],
      runsScored: 0,
      ballsFaced: 0,
      wasDismissed: false,
      oversBowled: 0,
      runsConceded: 0,
      wicketsTaken: 0,
      catchesTaken: 0,
      runOuts: 0,
    },
  });

  const addMatchMutation = useMutation({
    mutationFn: async (data: MatchFormData) => {
      const response = await apiRequest('POST', '/api/matches', {
        ...data,
        matchDate: new Date(data.matchDate).toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Match statistics saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save match statistics",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: MatchFormData) {
    addMatchMutation.mutate(values);
  }

  function resetForm() {
    form.reset();
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-foreground" data-testid="title-add-match">
        Add Match Statistics
      </h2>
      
      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Match Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Match Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="opponent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent Team</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter opponent team name"
                            data-testid="input-opponent"
                            {...field}
                          />
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
                          <Input
                            type="date"
                            data-testid="input-match-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Batting Performance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Batting Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="runsScored"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Runs Scored *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter runs scored"
                            data-testid="input-runs-scored"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ballsFaced"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balls Faced *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter balls faced"
                            data-testid="input-balls-faced"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="wasDismissed"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0 p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Were you dismissed?</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Turn on if you got out in this match (affects batting average calculation)
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-was-dismissed"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Bowling Performance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Bowling Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="oversBowled"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overs Bowled *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="e.g., 4.2"
                            data-testid="input-overs-bowled"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="runsConceded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Runs Conceded *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter runs conceded"
                            data-testid="input-runs-conceded"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wicketsTaken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wickets Taken *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter wickets taken"
                            data-testid="input-wickets-taken"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Fielding Performance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                  Fielding Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="catchesTaken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catches Taken *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter catches taken"
                            data-testid="input-catches-taken"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="runOuts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Run Outs *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter run outs"
                            data-testid="input-run-outs"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={resetForm}
                  data-testid="button-reset"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={addMatchMutation.isPending}
                  data-testid="button-save-match"
                >
                  {addMatchMutation.isPending ? "Saving..." : "Save Match Statistics"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
